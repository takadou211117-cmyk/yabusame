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
      return NextResponse.json({
        success: true,
        message: "Gemini APIキーが未設定のため、モックのノートデータを返します。",
        subject: {
          id: 'mock-subject',
          name: '線形代数学',
          color: '#4F46E5'
        },
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
      この画像は授業中の黒板またはスライドの写真です。内容を正確に理解し、復習しやすいMarkdownノートを作成してください。
      出力はJSONのみで、余計な説明は不要です。
      {
        "inferredSubject": "画像から推測される科目名（例: 線形代数学、力学など）",
        "title": "ノートのタイトル",
        "markdownContent": "作成したMarkdownノート（改行は\\nとしてエスケープしてください）"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-mini',
      temperature: 0.0,
      maxOutputTokens: 900,
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

    const inferredSubjectName = parsedData.inferredSubject || '未分類';

    // 科目を名前で検索、なければ作成
    let subject = await prisma.subject.findFirst({
      where: {
        name: inferredSubjectName,
        userId: user.id
      }
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          name: inferredSubjectName,
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
      subject: {
        id: subject.id,
        name: subject.name,
        color: subject.color,
      },
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
