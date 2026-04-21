import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 最初のユーザーを取得
    let user = await prisma.user.findFirst({
      include: {
        subjects: true,
      },
    });

    // ユーザーがいない場合は初期ユーザーを作成（デモ・開発用）
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'ゲストユーザー',
          university: '大学名未設定',
          age: 20,
          studyTime: 0,
        },
        include: {
          subjects: true,
        },
      });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { name, university, age } = await req.json();
    
    // 最初のユーザーを更新
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: firstUser.id },
      data: {
        name,
        university,
        age: parseInt(age) || 20,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'ユーザー情報の更新に失敗しました' }, { status: 500 });
  }
}
