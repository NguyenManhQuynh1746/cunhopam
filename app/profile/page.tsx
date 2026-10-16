'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, ShieldCheck, User, Mail, Calendar, Sparkles } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileData {
  role: 'user' | 'admin';
  full_name: string | null;
  avatar_url: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        setUser(user);

        // Lấy thông tin role từ bảng profiles
        const { data } = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setProfile(data);
        } else {
          setProfile({
            role: 'user',
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          });
        }
      } catch {
        // Xử lý khi chưa kết nối Supabase
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center text-muted text-sm">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  if (!user) return null;

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Người dùng';

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="max-w-xl mx-auto my-6 space-y-6">
      <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Header thông tin cá nhân */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-accent/15 text-accent border border-accent/30 flex items-center justify-center font-bold text-2xl overflow-hidden shrink-0">
            {profile?.avatar_url || user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile?.avatar_url || user.user_metadata?.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-ink">{displayName}</h1>
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Quản trị viên (Admin)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-soft text-muted px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  <User className="w-3.5 h-3.5" />
                  Thành viên
                </span>
              )}
            </div>
            <p className="text-sm text-muted flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        {/* Chi tiết tài khoản */}
        <div className="border-t border-line pt-5 space-y-3 text-sm">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Ngày tham gia
            </span>
            <span className="font-semibold text-ink">
              {new Date(user.created_at).toLocaleDateString('vi-VN')}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-muted flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Quyền hạn tài khoản
            </span>
            <span className="font-semibold text-ink">
              {isAdmin ? 'Toàn quyền duyệt bài & quản lý kho nhạc' : 'Đăng bài đóng góp & lưu playlist'}
            </span>
          </div>
        </div>

        {/* Nút đăng xuất */}
        <div className="border-t border-line pt-5 flex justify-end">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-5 py-2.5 bg-bg hover:bg-surface border border-line hover:border-red-400 text-red-600 dark:text-red-400 rounded-full text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}

