import React from 'react';

export default function GenresPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">Thể loại âm nhạc</h1>
        <p className="text-muted text-sm max-w-xl">
          Phân loại các ca khúc theo phong cách: Nhạc trẻ, Trữ tình, Pop/Rock, Nhạc Trịnh, Acoustic...
        </p>
      </div>

      <div className="border border-line border-dashed rounded-2xl p-8 text-center bg-surface">
        <p className="text-muted text-sm">
          Danh mục thể loại đang được thiết lập và chuẩn bị dữ liệu.
        </p>
      </div>
    </div>
  );
}

