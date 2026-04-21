import { NextRequest, NextResponse } from 'next';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

// APIキーがない場合はモックデータを返すためのフラグ
const HAS_API_KEY = !!process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: '画像が見つかりません' }, { status: 400 });
    }

    if (!HAS_API_KEY) {
      // APIキーがない場合のモックレスポンス（デモ用）
      await new Promise(resolve => setTimeout(resolve, 2000));
      return NextResponse.json({
        success: true,
        message: "Gemini APIキーが未設定のため、モックデータを返します。",
        subjects: [
          { name: "新しく検出した科目A", dayOfWeek: 1, period: 2 },
          { name: "新しく検出した科目B", dayOfWeek: 3, period: 4 }
        ]
      });
    }

    // 画像データをBase64に変換
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      この画像は学生の時間割表です。画像から科目名、曜日、時限（時間帯）を抽出し、以下のJSONフォーマットで返してください。
      JSON以外の文章を含めないでください。
      
      フォーマット:
      {
        "subjects": [
          { "name": "科目名", "dayOfWeek": "月/火/水/木/金/土", "period": "時限の数字（例: 1）" }
        ]
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

    // バッククォートなどを除去してJSONパース
    const text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const parsedData = JSON.parse(text);

    // Prismaを使ってDBに保存
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { name: 'ゲストユーザー', university: '大学名未設定', age: 20 }
      });
    }

    const createdSubjects = [];
    if (parsedData.subjects && Array.isArray(parsedData.subjects)) {
      const colors = ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];
      
      for (const s of parsedData.subjects) {
        const subject = await prisma.subject.create({
          data: {
            name: s.name,
            userId: user.id,
            color: colors[Math.floor(Math.random() * colors.length)],
            schedules: {
              create: {
                dayOfWeek: s.dayOfWeek === '月' ? 1 : s.dayOfWeek === '火' ? 2 : s.dayOfWeek === '水' ? 3 : s.dayOfWeek === '木' ? 4 : s.dayOfWeek === '金' ? 5 : s.dayOfWeek === '土' ? 6 : 0,
                period: parseInt(s.period) || 1,
              }
            }
          }
        });
        createdSubjects.push(subject);
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      createdSubjects
    });

  } catch (error: any) {
    console.error('Timetable upload error:', error);
    return NextResponse.json({ error: '時間割の解析中にエラーが発生しました', details: error.message }, { status: 500 });
  }
}
