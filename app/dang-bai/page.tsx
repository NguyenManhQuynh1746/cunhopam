import React from 'react';
import { Metadata } from 'next';
import ChordProEditor from '@/components/song/ChordProEditor';
import { publishSongAction } from '@/lib/songs/actions';

export const metadata: Metadata = {
  title: 'Đăng bài hát mới | cunhopam',
  description: 'Trình soạn thảo ChordPro thông minh: chèn hợp âm nhanh, kiểm tra cú pháp và chia sẻ cùng cộng đồng.',
};

export default function PublishSongPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Đăng bài hát mới
        </h1>
        <p className="text-muted text-xs sm:text-sm">
          Nhập lời bài hát và chèn hợp âm bằng cú pháp ChordPro. Bài hát sau khi đăng sẽ được duyệt bởi ban quản trị trước khi hiển thị công khai.
        </p>
      </div>

      <ChordProEditor
        mode="create"
        onSubmit={async (data) => {
          'use server';
          return await publishSongAction({
            title: data.title,
            artist_name: data.artist_name,
            key: data.key,
            content: data.content,
            rhythm_name: data.rhythm_name,
            genre_name: data.genre_name,
            license: data.license,
          });
        }}
      />
    </div>
  );
}

