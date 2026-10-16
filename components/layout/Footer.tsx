import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-line py-8 mt-auto text-muted text-sm bg-bg">
      <div className="wrap flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <strong className="text-ink">cunhopam</strong> – Thư viện hợp âm guitar & ukulele dành cho người Việt.
          <p className="text-xs text-muted mt-1">Tra bài hát, đổi tông, thế bấm ngón, chế độ biểu diễn và tìm bài theo hợp âm.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-2 text-xs">
          <Link href="/ban-quyen" className="hover:text-accent transition">
            Bản quyền & Gỡ bài
          </Link>
          <Link href="/dieu-khoan" className="hover:text-accent transition">
            Điều khoản dịch vụ
          </Link>
          <Link href="/bao-mat" className="hover:text-accent transition">
            Chính sách bảo mật
          </Link>
        </div>
      </div>
    </footer>
  );
}

