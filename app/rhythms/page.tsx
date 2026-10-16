import React from 'react';

export default function RhythmsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">Điệu bài hát</h1>
        <p className="text-muted text-sm max-w-xl">
          Khám phá bài hát theo các điệu gảy guitar quen thuộc: Ballad, Disco, Slow Rock, Bolero, Valse...
        </p>
      </div>

      <div className="border border-line border-dashed rounded-2xl p-8 text-center bg-surface">
        <p className="text-muted text-sm">
          Danh mục điệu đàn và hướng dẫn quạt chả / tỉa ngón sẽ được bổ sung.
        </p>
      </div>
    </div>
  );
}

