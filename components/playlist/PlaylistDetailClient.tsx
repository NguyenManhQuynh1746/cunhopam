'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  reorderPlaylistAction,
  removeSongFromPlaylistAction,
} from '@/lib/playlist/actions';
import PerformanceView, { PerformanceSong } from './PerformanceView';
import {
  ListMusic,
  Play,
  Share2,
  Lock,
  Globe,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Music2,
  ExternalLink,
} from 'lucide-react';

export interface PlaylistSongItem {
  id: string; // playlist_song id
  song_id: string;
  position: number;
  song: {
    id: string;
    title: string;
    slug: string;
    key: string;
    content: string;
    artist_name?: string | null;
  };
}

interface PlaylistDetailClientProps {
  playlist: {
    id: string;
    title: string;
    description?: string | null;
    is_public: boolean;
    user_id: string;
    created_at: string;
  };
  initialSongs: PlaylistSongItem[];
  isOwner: boolean;
}

export default function PlaylistDetailClient({
  playlist,
  initialSongs,
  isOwner,
}: PlaylistDetailClientProps) {
  const router = useRouter();
  const [songs, setSongs] = useState<PlaylistSongItem[]>(initialSongs);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const performanceSongs: PerformanceSong[] = songs.map((item) => ({
    id: item.song.id,
    title: item.song.title,
    slug: item.song.slug,
    key: item.song.key,
    content: item.song.content,
    artist_name: item.song.artist_name,
  }));

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        alert('Đã sao chép đường link!');
      }
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === songs.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newSongs = [...songs];
    const [moved] = newSongs.splice(index, 1);
    newSongs.splice(targetIdx, 0, moved);

    setSongs(newSongs);

    // Cập nhật vị trí lên server qua RPC reorder_playlist
    setIsReordering(true);
    const orderedSongIds = newSongs.map((s) => s.song.id);
    await reorderPlaylistAction(playlist.id, orderedSongIds);
    setIsReordering(false);
  };

  const handleRemoveSong = async (songId: string, songTitle: string) => {
    if (!window.confirm(`Xoá bài hát "${songTitle}" khỏi playlist?`)) return;

    const res = await removeSongFromPlaylistAction(playlist.id, songId);
    if (res.success) {
      setSongs((prev) => prev.filter((s) => s.song.id !== songId));
    } else {
      alert(res.error || 'Lỗi khi xoá bài khỏi playlist.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Playlist */}
      <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  playlist.is_public
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                    : 'bg-muted/10 text-muted border border-line'
                }`}
              >
                {playlist.is_public ? (
                  <>
                    <Globe className="w-3 h-3" />
                    <span>Playlist công khai</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Playlist riêng tư</span>
                  </>
                )}
              </span>

              <span className="text-xs text-muted">
                {songs.length} bài hát
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-ink tracking-tight">
              {playlist.title}
            </h1>

            {playlist.description && (
              <p className="text-sm text-muted leading-relaxed max-w-2xl">
                {playlist.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Nút Chế độ Biểu diễn */}
            <button
              onClick={() => setIsPerformanceOpen(true)}
              disabled={songs.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-dark text-ai text-sm font-bold shadow-md transition disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Chế độ Biểu diễn</span>
            </button>

            {/* Nút Chia sẻ */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-line bg-surface hover:bg-soft text-ink text-sm font-semibold transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Đã sao chép link' : 'Chia sẻ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách bài hát trong Playlist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider px-2">
          <span>Danh sách bài hát {isReordering && '(Đang lưu thứ tự...)'}</span>
          {isOwner && <span>Thứ tự & Thao tác</span>}
        </div>

        {songs.length === 0 ? (
          <div className="text-center py-12 border border-line border-dashed rounded-3xl bg-surface p-6 space-y-3">
            <Music2 className="w-10 h-10 text-muted mx-auto" />
            <p className="text-muted text-sm">
              Playlist hiện chưa có bài hát nào. Hãy mở bất kỳ bài hát nào và bấm <strong>"Lưu vào Playlist"</strong> để thêm bài vào đây.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-xs font-bold hover:bg-accent-dark transition"
              >
                <span>Khám phá bài hát</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((item, idx) => (
              <div
                key={item.id}
                className="bg-surface border border-line rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3 hover:border-line-hover transition"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="w-7 h-7 rounded-xl bg-bg border border-line text-xs font-mono font-bold text-muted flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>

                  <div className="truncate">
                    <Link
                      href={`/bai-hat/${item.song.slug}`}
                      className="font-bold text-sm sm:text-base text-ink hover:text-accent transition truncate block"
                    >
                      {item.song.title}
                    </Link>
                    <div className="text-xs text-muted truncate">
                      {item.song.artist_name || 'Truyền thống'} • Tông:{' '}
                      <span className="font-mono font-semibold text-accent">{item.song.key}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/bai-hat/${item.song.slug}`}
                    className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-soft transition"
                    title="Mở bài hát"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  {isOwner && (
                    <>
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0 || isReordering}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft transition disabled:opacity-30"
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === songs.length - 1 || isReordering}
                        className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft transition disabled:opacity-30"
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRemoveSong(item.song.id, item.song.title)}
                        className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 transition"
                        title="Xoá khỏi playlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Chế độ Biểu diễn toàn màn hình */}
      {isPerformanceOpen && (
        <PerformanceView
          songs={performanceSongs}
          isOpen={isPerformanceOpen}
          onClose={() => setIsPerformanceOpen(false)}
        />
      )}
    </div>
  );
}

