'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Đăng ký không thành công.' });
      } else if (data.session) {
        setMessage({ type: 'success', text: 'Đăng ký thành công! Đang chuyển hướng...' });
        router.push('/');
        router.refresh();
      } else {
        setMessage({
          type: 'success',
          text: 'Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác nhận tài khoản.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ Supabase. Vui lòng kiểm tra .env.local.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 p-6 sm:p-8 bg-surface border border-line rounded-3xl shadow-sm">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Tạo tài khoản mới</h1>
        <p className="text-sm text-muted">Trở thành thành viên cộng đồng hợp âm cunhopam</p>
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

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">Họ và tên</label>
          <div className="relative">
            <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-bg border border-line rounded-full py-2 pl-10 pr-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

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
          <label className="block text-xs font-semibold text-muted mb-1.5">Mật khẩu (ít nhất 6 ký tự)</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
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
          <UserPlus className="w-4 h-4" />
          <span>{loading ? 'Đang đăng ký...' : 'Đăng ký ngay'}</span>
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-muted">
        Đã có tài khoản?{' '}
        <Link href="/auth/login" className="font-semibold text-accent hover:underline">
          Đăng nhập tại đây
        </Link>
      </div>
    </div>
  );
}

