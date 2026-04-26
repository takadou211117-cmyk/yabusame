"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [remember, setRemember] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedUserId = localStorage.getItem('userId');
    if (savedEmail) setEmail(savedEmail);
    if (savedUserId) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage('処理中です...');

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body: any = { email, password };

    if (mode === 'register') {
      body.name = name;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatusMessage(data.error || '認証に失敗しました。');
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem('userId', String(data.user.id));
      if (remember) {
        localStorage.setItem('savedEmail', email);
      } else {
        localStorage.removeItem('savedEmail');
      }

      router.replace('/');
    } catch (error) {
      console.error('Authentication error:', error);
      setStatusMessage('通信に失敗しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>{mode === 'login' ? 'ログイン' : '新規登録'}</h1>
        <p className={styles.description}>
          メールアドレスとパスワードを保存すると、ブラウザ標準のパスワード管理機能で次回から自動入力が可能です。
          Face ID / Windows Hello 対応ブラウザでは、保存後に生体認証でログインできます。
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label className={styles.label}>
              名前
              <input
                type="text"
                name="name"
                autoComplete="name"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="表示名を入力"
              />
            </label>
          )}

          <label className={styles.label}>
            メールアドレス
            <input
              type="email"
              name="username"
              autoComplete="username"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
            />
          </label>

          <label className={styles.label}>
            パスワード
            <input
              type="password"
              name={mode === 'login' ? 'current-password' : 'new-password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力"
              required
            />
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            この端末にメールアドレスを保存する
          </label>

          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>

        {statusMessage && <p className={styles.status}>{statusMessage}</p>}

        <div className={styles.switchRow}>
          <button
            type="button"
            className={styles.switchButton}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setStatusMessage('');
            }}
          >
            {mode === 'login'
              ? 'まだアカウントがない場合はこちら'
              : 'すでにアカウントをお持ちの方はこちら'}
          </button>
        </div>
      </div>
    </div>
  );
}
