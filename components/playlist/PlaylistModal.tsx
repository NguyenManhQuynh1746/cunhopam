'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  addSongToPlaylistAction,
  removeSongFromPlaylistAction,
  createPlaylistAction,
} from '@/lib/playlist/actions';
import {
  ListMusic,
  Plus,
  Check,
  X,
  Lock,
  Globe,
  Loader2,
} from 'lucide-react';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  user: User | null;
}

interface UserPlaylist {
  id: string;
  title: string;
  is_public: boolean;
  hasSong: boolean;
}

export default function PlaylistModal({
  isOpen,
  onClose,
  songId,
  songTitle,
  user,
}: PlaylistModalProps) {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form tạo playlist nhanh
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;

    async function loadPlaylists() {
      setLoading(true);
      const supabase = createClient();

      // Lấy danh sách playlist của người dùng
      const { data: userPlaylists } = await supabase
        .from('playlists')
        .select('id, title, is_public')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Lấy danh sách playlist_songs đã chứa bài hát này
      const { data: songLinks } = await supabase
        .from('playlist_songs')
        .select('playlist_id')
        .eq('song_id', songId);

      const songInPlaylists = new Set((songLinks || []).map((x) => x.playlist_id));

      if (userPlaylists) {
        setPlaylists(
          userPlaylists.map((p) => ({
            id: p.id,
            title: p.title,
            is_public: p.is_public,
            hasSong: songInPlaylists.has(p.id),
          }))
        );
      }
      setLoading(false);
    }

    loadPlaylists();
  }, [isOpen, songId, user]);

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-surface border border-line rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl text-center">
          <ListMusic className="w-12 h-12 text-accent mx-auto" />
          <h3 className="font-bold text-ink text-lg">Đăng nhập để lưu vào Playlist</h3>
          <p className="text-muted text-xs leading-relaxed">
            Bạn cần tài khoản để tạo và sắp xếp bài hát vào các danh sách biểu diễn riêng.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink transition"
            >
              Đóng
            </button>
            <a
              href={`/auth/login?next=${encodeURIComponent(window.location.pathname)}`}
              className="flex-1 py-2 rounded-full bg-accent text-white text-xs font-bold hover:bg-accent-dark transition"
            >
              Đăng nhập
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleToggleSong = async (playlist: UserPlaylist) => {
    setActionLoadingId(playlist.id);

    if (playlist.hasSong) {
      await removeSongFromPlaylistAction(playlist.id, songId);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlist.id ? { ...p, hasSong: false } : p))
      );
    } else {
      await addSongToPlaylistAction(playlist.id, songId);
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlist.id ? { ...p, hasSong: true } : p))
      );
    }

    setActionLoadingId(null);
  };

  const handleCreateFast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreateLoading(true);
    const res = await createPlaylistAction(newTitle, '', newIsPublic);
    setCreateLoading(false);

    if (res.success && res.playlistId) {
      // Tự động thêm luôn bài hát vào playlist vừa tạo
      await addSongToPlaylistAction(res.playlistId, songId);
      setPlaylists((prev) => [
        {
          id: res.playlistId!,
          title: newTitle.trim(),
          is_public: newIsPublic,
          hasSong: true,
        },
        ...prev,
      ]);
      setNewTitle('');
      setShowCreate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-ink text-base">Lưu vào Playlist</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted hover:text-ink hover:bg-soft transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted truncate">
          Bài hát: <strong className="text-ink">{songTitle}</strong>
        </p>

        {/* Danh sách Playlist hiện có */}
        {loading ? (
          <div className="py-8 text-center text-muted text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span>Đang tải danh sách playlist...</span>
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {playlists.length === 0 ? (
              <p className="text-xs text-muted text-center py-4 italic">
                Bạn chưa có playlist nào. Hãy tạo danh sách đầu tiên bên dưới!
              </p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => handleToggleSong(pl)}
                  disabled={actionLoadingId === pl.id}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                    pl.hasSong
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-line bg-bg hover:border-line-hover text-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {pl.is_public ? (
                      <span title="Công khai"><Globe className="w-3.5 h-3.5 text-muted shrink-0" /></span>
                    ) : (
                      <span title="Riêng tư"><Lock className="w-3.5 h-3.5 text-muted shrink-0" /></span>
                    )}
                    <span className="text-sm truncate">{pl.title}</span>
                  </div>

                  <div className="shrink-0 pl-2">
                    {actionLoadingId === pl.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    ) : pl.hasSong ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                        <Check className="w-4 h-4" />
                        <span className="hidden sm:inline">Đã lưu</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted hover:text-ink">+ Thêm</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Form tạo nhanh Playlist mới */}
        {showCreate ? (
          <form onSubmit={handleCreateFast} className="p-3.5 rounded-2xl bg-bg border border-line space-y-3">
            <div className="text-xs font-bold text-ink">Tạo Playlist mới</div>
            <input
              type="text"
              required
              placeholder="Tên playlist (ví dụ: Tập đàn cuối tuần)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-surface border border-line rounded-xl px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-muted">
                <input
                  type="checkbox"
                  checked={newIsPublic}
                  onChange={(e) => setNewIsPublic(e.target.checked)}
                  className="rounded text-accent focus:ring-accent"
                />
                <span>Công khai (cho phép người khác xem)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-2.5 py-1 rounded-lg text-muted hover:text-ink transition"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newTitle.trim()}
                  className="px-3 py-1 rounded-lg bg-accent text-white font-bold transition disabled:opacity-50"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo & Thêm'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 px-3 rounded-2xl border border-line border-dashed bg-surface hover:bg-soft text-xs font-semibold text-accent transition flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Playlist mới</span>
          </button>
        )}
      </div>
    </div>
  );
}

