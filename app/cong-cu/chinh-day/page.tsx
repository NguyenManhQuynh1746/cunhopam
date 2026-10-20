import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GuitarTuner } from '@/components/tools/GuitarTuner';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chỉnh Dây Guitar Online (Guitar Tuner) | Cún Hợp Âm',
  description:
    'Công cụ chỉnh dây đàn guitar trực tuyến miễn phí qua micro. Hỗ trợ chuẩn xác tuning Standard, Drop D, nửa cung xuống (Eb). Nhận diện cao độ theo thời gian thực.',
};

export default function ChinhDayPage() {
  return (
    <div className="wrap py-6 sm:py-8">
      {/* Nút quay lại danh sách công cụ */}
      <div className="mb-4">
        <Link
          href="/cong-cu"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tất cả công cụ</span>
        </Link>
      </div>

      {/* Header trang */}
      <div className="text-center max-w-xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
          Chỉnh Dây Guitar Online
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Lên dây đàn guitar trực tiếp qua micro điện thoại hoặc máy tính. Độ chính xác cao độ theo cent.
        </p>
      </div>

      {/* Giao diện bộ chỉnh dây */}
      <GuitarTuner />
    </div>
  );
}

