'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Search } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';

export function Header() {
  const { notation, toggleNotation, theme, toggleTheme } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md border-b border-line">
      <div className="wrap">
        <div className="flex items-center gap-2 sm:gap-3 h-16">
          {/* Logo cunhopam */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-ink hover:opacity-90 transition-opacity shrink-0"
            aria-label="cunhopam"
          >
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
              <path
                d="M15 2c7 0 12 5 12 11 0 8-7 15-12 15S3 21 3 13C3 7 8 2 15 2z"
                fill="var(--accent)"
              />
              <circle cx="11" cy="12" r="2.6" fill="var(--pick)" />
              <circle cx="19" cy="17" r="2.6" fill="var(--pick)" />
            </svg>
            <span className="font-extrabold text-lg sm:text-xl hidden min-[400px]:inline">cunhopam</span>
          </Link>

          {/* Ô tìm kiếm */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem('q') as HTMLInputElement;
              if (input) {
                const val = input.value.trim();
                window.location.href = val ? `/?q=${encodeURIComponent(val)}` : '/';
              }
            }}
            className="flex-1 max-w-md ml-auto relative"
          >
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              name="q"
              type="search"
              placeholder="Tìm bài hát, ca sĩ..."
              aria-label="Tìm kiếm bài hát"
              className="w-full bg-surface border border-line rounded-full py-1.5 sm:py-2 pl-9 sm:pl-10 pr-4 text-xs sm:text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            />
          </form>

          {/* Nút đổi cách gọi tên nốt (C D E / Đô Rê Mi) */}
          <button
            onClick={toggleNotation}
            type="button"
            className="h-9 px-3 bg-surface border border-line rounded-full text-xs font-semibold text-ink hover:border-accent transition-colors flex items-center justify-center shrink-0"
            title="Đổi cách gọi tên nốt (C D E ↔ Đô Rê Mi)"
          >
            {notation === 'vi' ? 'Đô Rê Mi' : 'C D E'}
          </button>

          {/* Nút chuyển đổi Giao diện Sáng / Tối */}
          <button
            onClick={toggleTheme}
            type="button"
            className="w-9 h-9 bg-surface border border-line rounded-full text-base font-semibold text-ink hover:border-accent transition-colors flex items-center justify-center shrink-0"
            title="Đổi giao diện sáng / tối"
            aria-label="Đổi giao diện sáng hoặc tối"
          >
            {theme === 'dark' ? '☼' : '◐'}
          </button>

          {/* Nút đăng nhập / hồ sơ tài khoản */}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
