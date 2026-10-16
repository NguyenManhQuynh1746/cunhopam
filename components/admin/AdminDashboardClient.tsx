'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  adminVerifySongAction,
  adminRejectSongAction,
  adminTakedownSongAction,
  adminToggleHideCommentAction,
  adminDeleteCommentAction,
  adminBanUserAction,
  adminUnbanUserAction,
  adminApproveRevisionAction,
  adminRejectRevisionAction,
  adminRestoreRevisionAction,
  adminResolveReportAction,
  adminFulfillRequestAction,
} from '@/lib/admin/actions';
import { parseChordLyrics, RenderedLine } from '@/lib/chordpro/renderer';
import {
  ShieldCheck,
  FileCheck,
  History,
  AlertTriangle,
  MessageSquare,
  Users,
  ScrollText,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Lock,
  Unlock,
  RotateCcw,
  ExternalLink,
  Loader2,
  X,
  Search,
} from 'lucide-react';

interface Props {
  currentUserId: string;
  pendingSongs: any[];
  pendingRevisions: any[];
  reports: any[];
  recentComments: any[];
  users: any[];
  allRevisions: any[];
  adminLogs: any[];
  pendingRequests: any[];
}

export default function AdminDashboardClient({
  currentUserId,
  pendingSongs: initialPendingSongs,
  pendingRevisions: initialPendingRevisions,
  reports: initialReports,
  recentComments: initialComments,
  users: initialUsers,
  allRevisions: initialAllRevisions,
  adminLogs: initialLogs,
  pendingRequests,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    'verify' | 'revisions' | 'reports' | 'comments' | 'users' | 'history' | 'logs'
  >('verify');

  const [pendingSongs, setPendingSongs] = useState(initialPendingSongs);
  const [pendingRevisions, setPendingRevisions] = useState(initialPendingRevisions);
  const [reports, setReports] = useState(initialReports);
  const [comments, setComments] = useState(initialComments);
  const [users, setUsers] = useState(initialUsers);
  const [allRevisions, setAllRevisions] = useState(initialAllRevisions);
  const [logs, setLogs] = useState(initialLogs);

  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Preview Modal
  const [previewContent, setPreviewContent] = useState<{ title: string; content: string } | null>(null);

  // Fulfill Request Modal
  const [fulfillingReq, setFulfillingReq] = useState<any | null>(null);
  const [songIdToLink, setSongIdToLink] = useState('');

  // 1. Duyệt bài hát
  const handleVerifySong = async (id: string, slug: string) => {
    setLoadingId(id);
    const res = await adminVerifySongAction(id, slug);
    setLoadingId(null);
    if (res.success) {
      setPendingSongs((prev) => prev.filter((s) => s.id !== id));
    } else {
      alert(res.error || 'Lỗi khi duyệt bài.');
    }
  };

  // 2. Từ chối bài hát
  const handleRejectSong = async (id: string, slug: string) => {
    const reason = window.prompt('Nhập lý do từ chối bài hát (người đăng sẽ nhìn thấy lý do này):');
    if (!reason || !reason.trim()) return;

    setLoadingId(id);
    const res = await adminRejectSongAction(id, reason.trim(), slug);
    setLoadingId(null);
    if (res.success) {
      setPendingSongs((prev) => prev.filter((s) => s.id !== id));
    } else {
      alert(res.error || 'Lỗi khi từ chối bài.');
    }
  };

  // 3. Gỡ bài hát (Takedown)
  const handleTakedownSong = async (songId: string, slug: string) => {
    const reason = window.prompt('Nhập lý do gỡ bài hát (vi phạm bản quyền, yêu cầu từ tác giả...):');
    if (reason === null) return;

    setLoadingId(songId);
    const res = await adminTakedownSongAction(songId, 'removed', reason, slug);
    setLoadingId(null);
    if (res.success) {
      alert('Đã gỡ bài hát thành công. Bài hát lập tức biến mất khỏi trang công khai.');
    } else {
      alert(res.error || 'Lỗi khi gỡ bài hát.');
    }
  };

  // 4. Duyệt phiên bản sửa bài
  const handleApproveRevision = async (revId: string, songSlug?: string) => {
    setLoadingId(revId);
    const res = await adminApproveRevisionAction(revId, songSlug);
    setLoadingId(null);
    if (res.success) {
      setPendingRevisions((prev) => prev.filter((r) => r.id !== revId));
    } else {
      alert(res.error || 'Lỗi khi duyệt phiên bản.');
    }
  };

  // 5. Từ chối phiên bản sửa bài
  const handleRejectRevision = async (revId: string) => {
    const reason = window.prompt('Nhập lý do từ chối phiên bản sửa đổi:');
    if (!reason || !reason.trim()) return;

    setLoadingId(revId);
    const res = await adminRejectRevisionAction(revId, reason.trim());
    setLoadingId(null);
    if (res.success) {
      setPendingRevisions((prev) => prev.filter((r) => r.id !== revId));
    } else {
      alert(res.error || 'Lỗi khi từ chối phiên bản.');
    }
  };

  // 6. Khôi phục phiên bản cũ (Restore Revision)
  const handleRestoreRevision = async (revId: string, songSlug?: string) => {
    if (!window.confirm('Khôi phục bài hát về phiên bản này? Hành động này sẽ tạo một bản ghi mới và đồng bộ lại hợp âm.')) {
      return;
    }

    setLoadingId(revId);
    const res = await adminRestoreRevisionAction(revId, songSlug);
    setLoadingId(null);
    if (res.success) {
      alert('Đã khôi phục bài hát về phiên bản cũ thành công!');
    } else {
      alert(res.error || 'Lỗi khi khôi phục phiên bản.');
    }
  };

  // 7. Xử lý Báo cáo / Khiếu nại
  const handleResolveReport = async (reportId: string, status: string, takedown = false, songSlug?: string) => {
    const note = window.prompt('Ghi chú xử lý báo cáo:');
    if (note === null) return;

    setLoadingId(reportId);
    const res = await adminResolveReportAction(reportId, status, note, takedown, songSlug);
    setLoadingId(null);
    if (res.success) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    } else {
      alert(res.error || 'Lỗi khi xử lý báo cáo.');
    }
  };

  // 8. Ẩn / hiện bình luận
  const handleToggleHideComment = async (id: string, currentHidden: boolean) => {
    setLoadingId(id);
    const res = await adminToggleHideCommentAction(id, !currentHidden);
    setLoadingId(null);
    if (res.success) {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_hidden: !currentHidden } : c))
      );
    } else {
      alert(res.error || 'Lỗi khi cập nhật bình luận.');
    }
  };

  // 9. Xoá bình luận
  const handleDeleteComment = async (id: string) => {
    if (!window.confirm('Xoá vĩnh viễn bình luận này?')) return;
    setLoadingId(id);
    const res = await adminDeleteCommentAction(id);
    setLoadingId(null);
    if (res.success) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert(res.error || 'Lỗi khi xoá bình luận.');
    }
  };

  // 10. Khoá / Mở khoá thành viên
  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (isBanned) {
      setLoadingId(userId);
      const res = await adminUnbanUserAction(userId);
      setLoadingId(null);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_banned: false, ban_reason: null } : u))
        );
      } else {
        alert(res.error || 'Lỗi khi mở khoá tài khoản.');
      }
    } else {
      const reason = window.prompt('Nhập lý do khoá tài khoản:');
      if (!reason || !reason.trim()) return;

      setLoadingId(userId);
      const res = await adminBanUserAction(userId, reason.trim());
      setLoadingId(null);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_banned: true, ban_reason: reason.trim() } : u))
        );
      } else {
        alert(res.error || 'Lỗi khi khoá tài khoản.');
      }
    }
  };

  // 11. Gắn bài đã duyệt vào yêu cầu hợp âm
  const handleFulfillRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillingReq || !songIdToLink.trim()) return;

    setLoadingId('req_fulfill');
    const res = await adminFulfillRequestAction(fulfillingReq.id, songIdToLink.trim());
    setLoadingId(null);

    if (res.success) {
      alert('Đã gắn bài hát thành công!');
      setFulfillingReq(null);
      setSongIdToLink('');
    } else {
      alert(res.error || 'Lỗi khi liên kết bài hát.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-amber-500" />
            <span>Trung tâm Quản trị Admin</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Kiểm duyệt bài hát, xử lý khiếu nại bản quyền, quản lý bình luận và theo dõi nhật ký hoạt động.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-full border border-line bg-surface text-xs font-semibold text-ink hover:bg-soft transition"
          >
            Về trang chủ
          </Link>
        </div>
      </div>

      {/* Tabs điều hướng */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-line text-xs font-semibold">
        <button
          onClick={() => setActiveTab('verify')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'verify'
              ? 'bg-accent text-white shadow-xs'
              : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Duyệt bài mới ({pendingSongs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('revisions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'revisions'
              ? 'bg-accent text-white shadow-xs'
              : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Sửa đổi chờ duyệt ({pendingRevisions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'reports'
              ? 'bg-accent text-white shadow-xs'
              : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Báo lỗi / Khiếu nại ({reports.filter((r) => r.status === 'pending' || r.status === 'open').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'comments'
              ? 'bg-accent text-white shadow-xs'
              : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Bình luận ({comments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'users'
              ? 'bg-accent text-white shadow-xs'
              : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Thành viên ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'history'
              ? 'bg-accent text-white shadow-xs'
              : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử phiên bản</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'logs'
              ? 'bg-accent text-white shadow-xs'
              : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>Nhật ký quản trị ({logs.length})</span>
        </button>
      </div>

      {/* 1. Tab DUYỆT BÀI MỚI */}
      {activeTab === 'verify' && (
        <div className="space-y-4">
          {pendingSongs.length === 0 ? (
            <div className="text-center py-12 border border-line border-dashed rounded-3xl bg-surface p-6 text-muted text-sm">
              Không có bài hát nào đang chờ duyệt.
            </div>
          ) : (
            pendingSongs.map((song) => (
              <div
                key={song.id}
                className="bg-surface border border-line rounded-2xl p-5 shadow-xs flex flex-wrap items-start justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-lg text-ink">{song.title}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/30">
                      {song.license_type}
                    </span>
                    <span className="text-xs font-mono font-bold text-accent px-2 py-0.5 bg-bg border border-line rounded-lg">
                      Tông: {song.key}
                    </span>
                  </div>

                  <div className="text-xs text-muted">
                    Ca sĩ / Tác giả: <strong className="text-ink">{song.artists?.name || 'Chưa cập nhật'}</strong> • Người đăng:{' '}
                    <span className="font-mono">{song.profiles?.full_name || song.created_by}</span>
                  </div>

                  {song.rights_holder && (
                    <div className="text-xs text-muted">
                      Chủ sở hữu quyền: <strong className="text-ink">{song.rights_holder}</strong>
                    </div>
                  )}

                  {song.source_url && (
                    <div className="text-xs">
                      <a href={song.source_url} target="_blank" className="text-accent underline inline-flex items-center gap-1">
                        <span>Nguồn minh chứng</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewContent({ title: song.title, content: song.content })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-soft transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem trước</span>
                  </button>

                  <button
                    onClick={() => handleRejectSong(song.id, song.slug)}
                    disabled={loadingId === song.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-300 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>

                  <button
                    onClick={() => handleVerifySong(song.id, song.slug)}
                    disabled={loadingId === song.id}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                  >
                    {loadingId === song.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Phê duyệt</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. Tab PHIÊN BẢN SỬA ĐỔI CHỜ DUYỆT */}
      {activeTab === 'revisions' && (
        <div className="space-y-4">
          {pendingRevisions.length === 0 ? (
            <div className="text-center py-12 border border-line border-dashed rounded-3xl bg-surface p-6 text-muted text-sm">
              Không có phiên bản sửa đổi nào đang chờ duyệt.
            </div>
          ) : (
            pendingRevisions.map((rev) => (
              <div
                key={rev.id}
                className="bg-surface border border-line rounded-2xl p-5 shadow-xs flex flex-wrap items-start justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-lg text-ink">{rev.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-accent/10 text-accent">
                      Tông mới: {rev.key}
                    </span>
                  </div>

                  <p className="text-xs text-muted">
                    Bài gốc: <strong className="text-ink">{rev.song?.title}</strong> • Lý do sửa:{' '}
                    <span className="italic font-medium text-ink">"{rev.reason || 'Không ghi'}"</span>
                  </p>

                  <p className="text-[11px] text-muted">
                    Thời điểm gửi: {new Date(rev.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewContent({ title: `Bản sửa: ${rev.title}`, content: rev.content })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-soft transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem nội dung mới</span>
                  </button>

                  <button
                    onClick={() => handleRejectRevision(rev.id)}
                    disabled={loadingId === rev.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-300 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>

                  <button
                    onClick={() => handleApproveRevision(rev.id, rev.song?.slug)}
                    disabled={loadingId === rev.id}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs"
                  >
                    {loadingId === rev.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Duyệt áp dụng</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. Tab BÁO CÁO & KHIẾU NẠI (REPORTS / TAKEDOWN) */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-12 border border-line border-dashed rounded-3xl bg-surface p-6 text-muted text-sm">
              Chưa có báo cáo hoặc khiếu nại nào.
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-surface border border-line rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{rep.reason}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          rep.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : rep.status === 'dismissed'
                            ? 'bg-muted/10 text-muted'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <div className="text-xs text-muted mt-1">
                      Bài hát bị báo cáo:{' '}
                      {rep.song ? (
                        <Link href={`/bai-hat/${rep.song.slug}`} target="_blank" className="font-bold text-accent hover:underline">
                          {rep.song.title}
                        </Link>
                      ) : (
                        <span className="italic">Đã bị xoá</span>
                      )}
                      {rep.ip_address && <span className="ml-2 font-mono text-[11px]">• IP: {rep.ip_address}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {rep.song && (
                      <button
                        onClick={() => handleTakedownSong(rep.song.id, rep.song.slug)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
                      >
                        Gỡ bài (Takedown)
                      </button>
                    )}

                    <button
                      onClick={() => handleResolveReport(rep.id, 'resolved', false, rep.song?.slug)}
                      className="px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition"
                    >
                      Đã xử lý
                    </button>

                    <button
                      onClick={() => handleResolveReport(rep.id, 'dismissed', false)}
                      className="px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink transition"
                    >
                      Bác bỏ
                    </button>
                  </div>
                </div>

                {rep.details && (
                  <p className="p-3 rounded-xl bg-bg border border-line text-xs text-ink/90 italic">
                    "{rep.details}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Tab BÌNH LUẬN (COMMENTS) */}
      {activeTab === 'comments' && (
        <div className="space-y-3">
          {comments.map((cm) => (
            <div
              key={cm.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                cm.is_hidden ? 'bg-rose-500/5 border-rose-500/20 opacity-70' : 'bg-surface border border-line'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-ink">{cm.profiles?.full_name || 'Thành viên'}</span>
                  <span>•</span>
                  <span className="text-muted">
                    Bài:{' '}
                    <Link href={`/bai-hat/${cm.song?.slug}`} target="_blank" className="font-semibold text-accent hover:underline">
                      {cm.song?.title}
                    </Link>
                  </span>
                  <span>•</span>
                  <span className="text-muted">{new Date(cm.created_at).toLocaleString('vi-VN')}</span>
                  {cm.is_hidden && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                      ĐÃ ẨN
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink">{cm.content}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleHideComment(cm.id, cm.is_hidden)}
                  className="px-2.5 py-1 rounded-lg border border-line text-xs font-semibold hover:bg-soft transition"
                >
                  {cm.is_hidden ? 'Hiện lại' : 'Ẩn'}
                </button>
                <button
                  onClick={() => handleDeleteComment(cm.id)}
                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                  title="Xoá vĩnh viễn"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Tab QUẢN LÝ THÀNH VIÊN (USERS) */}
      {activeTab === 'users' && (
        <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-bg border-b border-line text-muted uppercase text-[11px]">
              <tr>
                <th className="p-3.5">Thành viên</th>
                <th className="p-3.5">Vai trò</th>
                <th className="p-3.5">Trạng thái</th>
                <th className="p-3.5">Ngày tham gia</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const isAdmin = u.role === 'admin';

                return (
                  <tr key={u.id} className="hover:bg-soft/50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-sm text-ink">{u.full_name || 'Chưa đặt tên'}</div>
                      <div className="font-mono text-[11px] text-muted">{u.id}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${isAdmin ? 'bg-amber-500/10 text-amber-600' : 'bg-bg text-muted'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.is_banned ? (
                        <span className="text-rose-600 font-bold">Đã khoá ({u.ban_reason})</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Bình thường</span>
                      )}
                    </td>
                    <td className="p-3.5 text-muted">{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="p-3.5 text-right">
                      {!isAdmin && !isSelf && (
                        <button
                          onClick={() => handleBanUser(u.id, u.is_banned)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                            u.is_banned
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-rose-300 text-rose-600 hover:bg-rose-500/10'
                          }`}
                        >
                          {u.is_banned ? 'Mở khoá' : 'Khoá tài khoản'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Tab LỊCH SỬ PHIÊN BẢN (REVISIONS) & KHÔI PHỤC */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {allRevisions.map((rev) => (
            <div key={rev.id} className="bg-surface border border-line rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">{rev.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-bg border border-line">
                    {rev.status}
                  </span>
                </div>
                <div className="text-xs text-muted mt-1">
                  Bài: <strong>{rev.song?.title}</strong> • Lý do: <em>{rev.reason}</em> • Người sửa:{' '}
                  {rev.profiles?.full_name || rev.revised_by} • {new Date(rev.created_at).toLocaleString('vi-VN')}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPreviewContent({ title: rev.title, content: rev.content })}
                  className="px-3 py-1.5 rounded-xl border border-line text-xs font-semibold hover:bg-soft transition"
                >
                  Xem
                </button>

                <button
                  onClick={() => handleRestoreRevision(rev.id, rev.song?.slug)}
                  className="px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-dark transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Tab NHẬT KÝ ADMIN_LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-ink">
            <thead className="bg-bg border-b border-line text-muted uppercase text-[11px]">
              <tr>
                <th className="p-3.5">Thời gian</th>
                <th className="p-3.5">Hành động</th>
                <th className="p-3.5">Đối tượng</th>
                <th className="p-3.5">Mã ID</th>
                <th className="p-3.5">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((lg) => (
                <tr key={lg.id} className="hover:bg-soft/50 font-mono">
                  <td className="p-3.5 text-muted">{new Date(lg.created_at).toLocaleString('vi-VN')}</td>
                  <td className="p-3.5 font-bold text-accent">{lg.action}</td>
                  <td className="p-3.5">{lg.target_type}</td>
                  <td className="p-3.5 text-[11px] text-muted truncate max-w-[150px]">{lg.target_id}</td>
                  <td className="p-3.5 text-[11px] max-w-xs truncate">{JSON.stringify(lg.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Xem trước Chord Sheet */}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col justify-between shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-bold text-ink text-lg truncate">{previewContent.title}</h3>
              <button
                onClick={() => setPreviewContent(null)}
                className="p-1 rounded-full text-muted hover:text-ink transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-4 rounded-2xl bg-bg border border-line font-sans text-sm select-text">
              {parseChordLyrics(previewContent.content).map((line, lIdx) => {
                if (line.type === 'empty') return <div key={lIdx} className="h-4" />;
                if (line.type === 'comment') {
                  return <div key={lIdx} className="font-bold text-accent text-xs uppercase">[{line.comment}]</div>;
                }
                return (
                  <div key={lIdx} className="flex flex-wrap items-end leading-none py-0.5">
                    {line.segments?.map((seg, sIdx) => (
                      <span key={sIdx} className="inline-flex flex-col items-start pr-1">
                        {seg.chord ? (
                          <span className="font-bold text-accent text-[0.88em] leading-tight pb-0.5 font-mono select-none">
                            {seg.chord}
                          </span>
                        ) : (
                          <span className="h-[1em] leading-tight select-none opacity-0">&nbsp;</span>
                        )}
                        <span className="text-ink whitespace-pre font-normal leading-normal">
                          {seg.text || ' '}
                        </span>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewContent(null)}
                className="px-5 py-2 rounded-full bg-surface border border-line text-sm font-semibold text-ink hover:bg-soft transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

