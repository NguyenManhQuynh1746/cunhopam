'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import {
  createSongRequestAction,
  toggleVoteAction,
  checkSimilarityAction,
  SimilarityResult,
} from '@/lib/requests/actions';
import {
  ThumbsUp,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  AlertTriangle,
  Music2,
  X,
  Loader2,
} from 'lucide-react';

export interface RequestItemData {
  id: string;
  title: string;
  artist_name: string;
  note?: string | null;
  status: 'pending' | 'fulfilled' | 'rejected';
  votes_count: number;
  created_at: string;
  user_voted: boolean;
  fulfilled_song?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

interface SongRequestClientProps {
  initialRequests: RequestItemData[];
  user: User | null;
}

export default function SongRequestClient({
  initialRequests,
  user,
}: SongRequestClientProps) {
  const [requests, setRequests] = useState<RequestItemData[]>(initialRequests);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'fulfilled'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal tạo yêu cầu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqArtist, setReqArtist] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trùng lặp cảnh báo (Similarity Check)
  const [similarity, setSimilarity] = useState<SimilarityResult | null>(null);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!reqTitle.trim() || reqTitle.trim().length < 2) {
      setSimilarity(null);
      return;
    }

    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setCheckingSimilarity(true);
      const res = await checkSimilarityAction(reqTitle);
      setSimilarity(res);
      setCheckingSimilarity(false);
    }, 400);

    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [reqTitle]);

  const handleVote = async (requestId: string) => {
    if (!user) {
      alert('Vui lòng đăng nhập để bình chọn bài hát yêu cầu.');
      return;
    }

    setActionLoadingId(requestId);
    const target = requests.find((r) => r.id === requestId);
    if (!target) return;

    const newVoted = !target.user_voted;
    const countDiff = newVoted ? 1 : -1;

    // Cập nhật lạc quan (Optimistic update)
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, user_voted: newVoted, votes_count: Math.max(0, r.votes_count + countDiff) }
          : r
      )
    );

    const res = await toggleVoteAction(requestId);
    if (!res.success) {
      // Revert nếu lỗi
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, user_voted: target.user_voted, votes_count: target.votes_count }
            : r
        )
      );
      alert(res.error || 'Lỗi khi bình chọn.');
    }

    setActionLoadingId(null);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle.trim() || !reqArtist.trim()) return;

    setLoading(true);
    setError(null);

    const res = await createSongRequestAction(reqTitle, reqArtist, reqNote);
    setLoading(false);

    if (res.success && res.requestId) {
      const newReq: RequestItemData = {
        id: res.requestId,
        title: reqTitle.trim(),
        artist_name: reqArtist.trim(),
        note: reqNote.trim(),
        status: 'pending',
        votes_count: 1,
        created_at: new Date().toISOString(),
        user_voted: true,
      };

      setRequests((prev) => [newReq, ...prev]);
      setIsModalOpen(false);
      setReqTitle('');
      setReqArtist('');
      setReqNote('');
      setSimilarity(null);
    } else {
      setError(res.error || 'Có lỗi xảy ra khi gửi yêu cầu.');
    }
  };

  // Lọc danh sách yêu cầu
  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (activeTab === 'fulfilled' && r.status !== 'fulfilled') return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.artist_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <Music2 className="w-8 h-8 text-accent" />
            <span>Yêu cầu hợp âm</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Gửi yêu cầu bài hát bạn chưa tìm thấy hoặc bình chọn để các nhạc sĩ/thành viên cunhopam ưu tiên ký âm sớm nhất.
          </p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              window.location.href = `/auth/login?next=/yeu-cau`;
            } else {
              setIsModalOpen(true);
            }
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent hover:bg-accent-dark text-ai text-sm font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Gửi yêu cầu bài mới</span>
        </button>
      </div>

      {/* Tabs & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-surface p-1 rounded-2xl border border-line text-xs font-semibold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'all' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'}`}
          >
            Tất cả ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'pending' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'}`}
          >
            Chờ hợp âm ({requests.filter((r) => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('fulfilled')}
            className={`px-3 py-1.5 rounded-xl transition ${activeTab === 'fulfilled' ? 'bg-accent text-white shadow-xs' : 'text-muted hover:text-ink'}`}
          >
            Đã có bài ({requests.filter((r) => r.status === 'fulfilled').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Lọc theo tên bài, ca sĩ..."
            className="w-full bg-surface border border-line rounded-xl pl-9 pr-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Danh sách yêu cầu */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 border border-line border-dashed rounded-3xl bg-surface p-6 space-y-2">
          <Music2 className="w-10 h-10 text-muted mx-auto" />
          <p className="text-muted text-sm">Không tìm thấy yêu cầu hợp âm nào phù hợp.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-surface border border-line rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 hover:border-line-hover transition"
            >
              {/* Nút Bình chọn Vote */}
              <button
                onClick={() => handleVote(req.id)}
                disabled={actionLoadingId === req.id}
                className={`flex flex-col items-center justify-center min-w-[3.5rem] py-2 px-3 rounded-2xl border transition active:scale-95 ${
                  req.user_voted
                    ? 'border-accent bg-accent/10 text-accent font-bold shadow-xs'
                    : 'border-line bg-bg hover:border-accent text-muted hover:text-ink'
                }`}
                title={req.user_voted ? 'Bấm để huỷ bình chọn' : 'Bấm để bình chọn cho bài này'}
              >
                <ThumbsUp className={`w-4 h-4 ${req.user_voted ? 'fill-current' : ''}`} />
                <span className="text-xs font-mono font-extrabold mt-0.5">{req.votes_count}</span>
              </button>

              {/* Thông tin bài yêu cầu */}
              <div className="flex-1 truncate space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base sm:text-lg text-ink truncate">
                    {req.title}
                  </span>

                  {req.status === 'fulfilled' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã có hợp âm</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      <Clock className="w-3 h-3" />
                      <span>Đang chờ</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted truncate">
                  Nghệ sĩ / Ca sĩ: <strong className="text-ink">{req.artist_name}</strong>
                  {req.note && (
                    <span className="ml-2 italic text-muted">• "{req.note}"</span>
                  )}
                </div>
              </div>

              {/* Liên kết đến bài hát nếu đã có */}
              {req.status === 'fulfilled' && req.fulfilled_song && (
                <Link
                  href={`/bai-hat/${req.fulfilled_song.slug}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-dark transition shrink-0 shadow-xs"
                >
                  <span>Chơi bài này</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal gửi yêu cầu bài hát mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleCreateRequest}
            className="bg-surface border border-line rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-bold text-ink text-lg">Gửi yêu cầu hợp âm mới</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-muted hover:text-ink transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Tên bài hát <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  placeholder="Ví dụ: Tình ca người lính..."
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Cảnh báo bài hát tương tự đã có (Similarity Check) */}
              {similarity && (similarity.existingSongs.length > 0 || similarity.existingRequests.length > 0) && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Hệ thống phát hiện nội dung tương tự đã có:</span>
                  </div>

                  {similarity.existingSongs.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-muted text-[11px] font-semibold">Bài hát đã có hợp âm:</span>
                      {similarity.existingSongs.map((s) => (
                        <div key={s.id} className="flex items-center justify-between gap-2 pl-2">
                          <span className="text-ink font-medium truncate">• {s.title} ({s.artist_name || 'Nhiều ca sĩ'})</span>
                          <Link
                            href={`/bai-hat/${s.slug}`}
                            target="_blank"
                            className="text-accent underline font-bold shrink-0 inline-flex items-center gap-0.5"
                          >
                            <span>Xem ngay</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  {similarity.existingRequests.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-amber-500/20">
                      <span className="text-muted text-[11px] font-semibold">Yêu cầu đã được gửi trước đó:</span>
                      {similarity.existingRequests.map((r) => (
                        <div key={r.id} className="text-ink font-medium pl-2">
                          • {r.title} - {r.artist_name} ({r.votes_count} phiếu bầu)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Ca sĩ / Nhạc sĩ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  placeholder="Ví dụ: Hoàng Dũng..."
                  value={reqArtist}
                  onChange={(e) => setReqArtist(e.target.value)}
                  className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Ghi chú hoặc link nghe thử (tuỳ chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Đường dẫn YouTube hoặc phiên bản bạn muốn chơi..."
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
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
                disabled={loading || !reqTitle.trim() || !reqArtist.trim()}
                className="px-5 py-2 rounded-full bg-accent hover:bg-accent-dark text-ai text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

