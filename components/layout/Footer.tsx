import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-line py-8 mt-auto text-muted text-sm bg-bg">
      <div className="wrap flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <strong className="text-ink">cunhopam</strong> – Thư viện hợp âm guitar dành cho người Việt.
          <p className="text-xs text-muted mt-1">Tra bài hát, đổi tông, xem thế bấm ngón và hỗ trợ luyện tập.</p>
        </div>
        <div className="text-xs text-muted">
          Giai đoạn 0: Khởi tạo nền tảng Next.js + Tailwind + Core Chords.
        </div>
      </div>
    </footer>
  );
}

