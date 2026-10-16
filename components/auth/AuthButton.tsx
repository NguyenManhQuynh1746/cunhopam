'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User, LogIn } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch {
        // Chưa cấu hình Supabase hoặc chưa đăng nhập
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-surface border border-line animate-pulse shrink-0" />
    );
  }

  if (user) {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Tài khoản';

    return (
      <Link
        href="/profile"
        className="flex items-center gap-2 h-9 px-3 bg-surface border border-line rounded-full text-xs font-semibold text-ink hover:border-accent transition-colors shrink-0"
        title="Trang cá nhân"
      >
        <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px] overflow-hidden">
          {user.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.user_metadata.avatar_url}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="flex items-center gap-1.5 h-9 px-3.5 bg-accent hover:bg-accent-dark text-ai text-xs font-semibold rounded-full transition-colors shrink-0"
    >
      <LogIn className="w-3.5 h-3.5" />
      <span>Đăng nhập</span>
    </Link>
  );
}

