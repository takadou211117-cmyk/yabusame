import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

const hashPassword = (password: string) =>
  createHash('sha256').update(password).digest('hex');

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードは必須です。' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います。' }, { status: 401 });
    }

    const hashedInput = hashPassword(password);
    const passwordMatches = user.password === password || user.password === hashedInput;

    if (!passwordMatches) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います。' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'ログインに失敗しました。' }, { status: 500 });
  }
}
