'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/';
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Đăng nhập không thành công.' });
      } else {
        setMessage({ type: 'success', text: 'Đăng nhập thành công! Đang chuyển hướng...' });
        const target = nextUrl.startsWith('/') ? nextUrl : '/';
        router.push(target);
        router.refresh();
      }
    } catch {
      setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ Supabase. Vui lòng kiểm tra .env.local.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setMessage(null);
    try {
      const target = nextUrl.startsWith('/') ? nextUrl : '/';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
        },
      });

      if (error) {
        setMessage({
          type: 'error',
          text: `Google OAuth chưa được kích hoạt hoặc cấu hình sai: ${error.message}. Bạn có thể đăng nhập bằng Email.`,
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Chưa thể kết nối Google OAuth. Bạn có thể sử dụng đăng nhập bằng Email bình thường.',
      });
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 p-6 sm:p-8 bg-surface border border-line rounded-3xl shadow-sm">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Đăng nhập cunhopam</h1>
        <p className="text-sm text-muted">Lưu playlist cá nhân và tham gia đóng góp hợp âm</p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-start gap-2 mb-5 ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900'
              : 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{message.text}</p>
        </div>
      )}

      {/* Đăng nhập bằng Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-surface border border-line hover:border-accent rounded-full text-sm font-semibold text-ink transition-colors mb-5"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Tiếp tục với Google</span>
      </button>

      <div className="relative flex items-center justify-center mb-5">
        <div className="border-t border-line w-full" />
        <span className="bg-surface px-3 text-xs text-muted font-medium absolute">hoặc email</span>
      </div>

      {/* Form đăng nhập email */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">Địa chỉ Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ten@example.com"
              className="w-full bg-bg border border-line rounded-full py-2 pl-10 pr-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">Mật khẩu</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg border border-line rounded-full py-2 pl-10 pr-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-accent hover:bg-accent-dark text-ai rounded-full text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-muted">
        Chưa có tài khoản?{' '}
        <Link href="/auth/register" className="font-semibold text-accent hover:underline">
          Đăng ký miễn phí
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto my-12 text-center text-muted">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}

