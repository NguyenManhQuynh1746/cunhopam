'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  createPlaylistAction,
  updatePlaylistAction,
  deletePlaylistAction,
} from '@/lib/playlist/actions';
import {
  ListMusic,
  Plus,
  Globe,
  Lock,
  Music2,
  Trash2,
  Edit2,
  ExternalLink,
  Calendar,
} from 'lucide-react';

export interface PlaylistItemData {
  id: string;
  title: string;
  description?: string | null;
  is_public: boolean;
  created_at: string;
  song_count: number;
}

interface PlaylistManagerClientProps {
  initialPlaylists: PlaylistItemData[];
}

export default function PlaylistManagerClient({
  initialPlaylists,
}: PlaylistManagerClientProps) {
  const [playlists, setPlaylists] = useState<PlaylistItemData[]>(initialPlaylists);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistItemData | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingPlaylist(null);
    setTitle('');
    setDescription('');
    setIsPublic(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: PlaylistItemData) => {
    setEditingPlaylist(p);
    setTitle(p.title);
    setDescription(p.description || '');
    setIsPublic(p.is_public);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    if (editingPlaylist) {
      const res = await updatePlaylistAction(editingPlaylist.id, title, description, isPublic);
      setLoading(false);
      if (res.success) {
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === editingPlaylist.id
              ? { ...p, title: title.trim(), description: description.trim(), is_public: isPublic }
              : p
          )
        );
        setIsModalOpen(false);
      } else {
        setError(res.error || 'Lỗi khi cập nhật playlist.');
      }
    } else {
      const res = await createPlaylistAction(title, description, isPublic);
      setLoading(false);
      if (res.success && res.playlistId) {
        const newPl: PlaylistItemData = {
          id: res.playlistId,
          title: title.trim(),
          description: description.trim(),
          is_public: isPublic,
          created_at: new Date().toISOString(),
          song_count: 0,
        };
        setPlaylists((prev) => [newPl, ...prev]);
        setIsModalOpen(false);
      } else {
        setError(res.error || 'Lỗi khi tạo playlist.');
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá playlist "${name}" không?`)) {
      return;
    }

    const res = await deletePlaylistAction(id);
    if (res.success) {
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(res.error || 'Không thể xoá playlist.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <ListMusic className="w-8 h-8 text-accent" />
            <span>Playlist của tôi</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Tập hợp những bài hát yêu thích để tiện luyện tập và bật chế độ Biểu diễn toàn màn hình.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent hover:bg-accent-dark text-ai text-sm font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Playlist mới</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16 border border-line border-dashed rounded-3xl bg-surface p-6 space-y-3">
          <ListMusic className="w-12 h-12 text-muted mx-auto stroke-[1.5]" />
          <h3 className="font-bold text-ink">Chưa có playlist nào</h3>
          <p className="text-muted text-xs sm:text-sm max-w-md mx-auto">
            Hãy tạo danh sách bài hát đầu tiên để lưu lại các bài hát yêu thích phục vụ các buổi tập đàn và biểu diễn.
          </p>
          <div className="pt-2">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent-dark transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo playlist ngay</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="bg-surface border border-line rounded-3xl p-5 shadow-xs hover:border-line-hover transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      pl.is_public
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : 'bg-muted/10 text-muted border border-line'
                    }`}
                  >
                    {pl.is_public ? (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>Công khai</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Riêng tư</span>
                      </>
                    )}
                  </span>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditModal(pl)}
                      className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-soft transition"
                      title="Chỉnh sửa playlist"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pl.id, pl.title)}
                      className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-500/10 transition"
                      title="Xoá playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <Link
                  href={`/playlist/${pl.id}`}
                  className="block font-bold text-lg text-ink hover:text-accent transition line-clamp-1"
                >
                  {pl.title}
                </Link>

                {pl.description && (
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {pl.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-muted">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  <Music2 className="w-3.5 h-3.5 text-accent" />
                  <span>{pl.song_count} bài hát</span>
                </div>

                <Link
                  href={`/playlist/${pl.id}`}
                  className="inline-flex items-center gap-1 font-bold text-accent hover:underline"
                >
                  <span>Mở danh sách</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tạo / Sửa Playlist */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleSave}
            className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h3 className="font-bold text-ink text-lg">
              {editingPlaylist ? 'Chỉnh sửa Playlist' : 'Tạo Playlist mới'}
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Tên Playlist <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nhạc Trịnh tuyển chọn..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về playlist này..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded text-accent focus:ring-accent"
                  />
                  <span className="text-xs text-ink font-semibold">
                    Công khai (Bất kỳ ai có đường link đều có thể xem)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-muted hover:text-ink transition"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="px-5 py-2 rounded-full bg-accent hover:bg-accent-dark text-ai text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : editingPlaylist ? 'Cập nhật' : 'Tạo Playlist'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

