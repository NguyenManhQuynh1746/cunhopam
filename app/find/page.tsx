import React from 'react';

export default function FindByChordsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">Tìm bài hát theo hợp âm</h1>
        <p className="text-muted text-sm max-w-xl">
          Chọn những hợp âm bạn đã bấm thành thạo. Hệ thống sẽ gợi ý các bài hát có thể chơi được ngay.
        </p>
      </div>

      <div className="border border-line border-dashed rounded-2xl p-8 text-center bg-surface">
        <p className="text-muted text-sm">
          Tính năng lọc bài hát theo các hợp âm đã biết sẽ được tích hợp ở giai đoạn tiếp theo.
        </p>
      </div>
    </div>
  );
}

