'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface FavoriteButtonProps {
  songId: string;
  initialIsFavorited: boolean;
  user: User | null;
  songSlug: string;
}

export default function FavoriteButton({
  songId,
  initialIsFavorited,
  user,
  songSlug,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    if (!user) {
      if (confirm('Bạn cần đăng nhập để lưu bài hát vào danh sách yêu thích. Đến trang đăng nhập ngay?')) {
        router.push(`/login?next=/bai-hat/${songSlug}`);
      }
      return;
    }

    const previousState = isFavorited;
    setIsFavorited(!previousState);
    setLoading(true);

    try {
      const supabase = createClient();
      if (!previousState) {
        // Thêm vào favorites
        const { error } = await supabase.from('favorites').insert({
          user_id: user.id,
          song_id: songId,
        });
        if (error && error.code !== '23505') { // 23505 là unique violation nếu đã có
          throw error;
        }
      } else {
        // Xoá khỏi favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', songId);
        if (error) throw error;
      }
      router.refresh();
    } catch (err) {
      console.error('Lỗi khi cập nhật danh sách yêu thích:', err);
      // Rollback
      setIsFavorited(previousState);
      alert('Không thể cập nhật danh sách yêu thích. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold border transition ${
        isFavorited
          ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400'
          : 'bg-surface border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      aria-label={isFavorited ? 'Bỏ lưu bài hát' : 'Lưu bài hát vào yêu thích'}
      aria-pressed={isFavorited}
    >
      <svg
        className={`w-4 h-4 transition ${isFavorited ? 'fill-rose-500 text-rose-500' : 'fill-none text-current'}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{isFavorited ? 'Đã lưu' : 'Lưu bài hát'}</span>
    </button>
  );
}

