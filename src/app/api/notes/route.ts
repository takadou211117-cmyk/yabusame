import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

const HAS_API_KEY = !!process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const now = new Date();

    if (!image) {
      return NextResponse.json({ error: '画像が見つかりません' }, { status: 400 });
    }

    if (!HAS_API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return NextResponse.json({
        success: true,
        message: "Gemini APIキーが未設定のため、モックのノートデータを返します。",
        subject: "線形代数学",
        note: {
          title: "行列の固有値と固有ベクトル",
          content: "# 行列の固有値と固有ベクトル\n\n## 1. 固有値方程式\n正方行列 $A$ に対して、$A\\vec{x} = \\lambda\\vec{x}$ を満たすスカラー $\\lambda$ を固有値、ベクトル $\\vec{x} (\\neq \\vec{0})$ を固有ベクトルと呼ぶ。\n\n## 2. 求め方\n1. 固有多項式 $|A - \\lambda I| = 0$ を解き、固有値 $\\lambda$ を求める。\n2. 各 $\\lambda$ に対して連立方程式 $(A - \\lambda I)\\vec{x} = \\vec{0}$ を解き、固有ベクトル $\\vec{x}$ を求める。\n\n> 💡 **東大生ポイント**: 行列の対角化可能性は、独立な固有ベクトルの数と次元が一致するかどうかで判定できる！",
        }
      });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 1. 画像から内容を読み取り、東大生クオリティのMarkdownノートを生成するプロンプト
    const prompt = `
      あなたは東京大学に首席で合格した天才的な学生です。
      提供された画像は授業中の黒板またはスライドの写真です。

      この画像の内容を完璧に理解し、後から復習するのに最適な「東大生クオリティのノート」をMarkdown形式で作成してください。
      
      【ノート作成のルール】
      - 構造的で非常に論理的な構成にする（大見出し、中見出し、箇条書きを駆使する）
      - 黒板に書かれている数式や重要な用語は正確に抽出する
      - 黒板の内容だけでなく、その背景にある概念や「なぜそうなるのか」という補足説明（東大生ポイント）を加える
      - 視覚的に見やすいMarkdown（引用、太字、リストなど）を使う
      
      以下のJSONフォーマットで返してください。JSON以外の文章は含めないでください。
      {
        "inferredSubject": "画像から推測される科目名（例: 線形代数学、力学など）",
        "title": "ノートのタイトル",
        "markdownContent": "作成したMarkdownノート（改行は\\nとしてエスケープしてください）"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.type,
                data: base64Image,
              }
            }
          ]
        }
      ]
    });

    const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const parsedData = JSON.parse(text);

    // ユーザーと科目を取得または作成
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { name: 'ゲストユーザー', university: '大学名未設定', age: 20 }
      });
    }

    // 科目を名前で検索、なければ作成
    let subject = await prisma.subject.findFirst({
      where: { 
        name: parsedData.inferredSubject,
        userId: user.id 
      }
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          name: parsedData.inferredSubject,
          userId: user.id,
          color: '#4F46E5'
        }
      });
    }

    // ノートをDBに保存
    const savedNote = await prisma.note.create({
      data: {
        title: parsedData.title,
        content: parsedData.markdownContent,
        subjectId: subject.id,
      }
    });

    return NextResponse.json({
      success: true,
      subject: subject.name,
      note: {
        id: savedNote.id,
        title: savedNote.title,
        content: savedNote.content
      }
    });

  } catch (error: any) {
    console.error('Note generation error:', error);
    return NextResponse.json({ error: 'ノートの生成中にエラーが発生しました', details: error.message }, { status: 500 });
  }
}
