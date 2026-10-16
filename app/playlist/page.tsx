import React from 'react';

export default function PlaylistPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">Playlist của tôi</h1>
        <p className="text-muted text-sm max-w-xl">
          Tập hợp những bài hát yêu thích được bạn lưu lại để tiện tập luyện và biểu diễn.
        </p>
      </div>

      <div className="border border-line border-dashed rounded-2xl p-8 text-center bg-surface">
        <p className="text-muted text-sm">
          Playlist hiện tại đang trống. Tính năng quản lý danh sách sẽ hoàn thiện trong các giai đoạn tới.
        </p>
      </div>
    </div>
  );
}

