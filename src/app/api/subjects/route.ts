import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { name: 'ゲストユーザー', university: '大学名未設定', age: 20 }
      });
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        userId: user.id,
        color: '#4F46E5'
      }
    });

    return NextResponse.json(subject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'IDが必要です' }, { status: 400 });

    await prisma.subject.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
