'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Bài hát', href: '/' },
  { label: 'Hợp âm', href: '/chords' },
  { label: 'Tìm theo hợp âm', href: '/find' },
  { label: 'Bài đã lưu', href: '/da-luu' },
  { label: 'Điệu', href: '/rhythms' },
  { label: 'Thể loại', href: '/genres' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-bg border-b border-line py-2">
      <div className="wrap">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ink text-bg font-semibold'
                    : 'text-muted hover:text-ink hover:bg-surface'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

