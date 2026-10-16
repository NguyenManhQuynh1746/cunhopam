'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';

interface ReportModalProps {
  songId: string;
  songTitle: string;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({
  songId,
  songTitle,
  user,
  isOpen,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState<'copyright' | 'chord_error' | 'lyrics_error' | 'other'>('copyright');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mô tả chi tiết lý do.' });
      return;
    }

    if (reason !== 'copyright' && !user) {
      setMessage({
        type: 'error',
        text: 'Bạn cần đăng nhập để gửi báo lỗi nội dung. Hãy chuyển sang lý do "Vi phạm bản quyền" nếu bạn là chủ sở hữu quyền.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          reason,
          details,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi gửi báo cáo');
      }

      setMessage({ type: 'success', text: data.message });
      setDetails('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Báo lỗi / Yêu cầu gỡ bài</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Đóng hộp thoại"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs text-muted">
          Bài hát: <strong className="text-foreground">{songTitle}</strong>
        </p>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Lý do báo cáo
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="copyright">Vi phạm bản quyền / Yêu cầu gỡ bài (Công khai)</option>
              <option value="chord_error">Sai hợp âm / Hợp âm không chuẩn (Cần đăng nhập)</option>
              <option value="lyrics_error">Sai lời bài hát / Thiếu đoạn (Cần đăng nhập)</option>
              <option value="other">Lý do khác (Cần đăng nhập)</option>
            </select>
            {reason !== 'copyright' && !user && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Cần đăng nhập tài khoản để báo lỗi nội dung.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted mb-1">
              Chi tiết / Bằng chứng / Thông tin liên hệ
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                reason === 'copyright'
                  ? 'Vui lòng cung cấp link bản quyền gốc, bằng chứng quyền tác giả hoặc thông tin đại diện để chúng tôi gỡ bài lập tức...'
                  : 'Mô tả vị trí sai hoặc cách sửa hợp âm đúng...'
              }
              rows={4}
              maxLength={1500}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <div className="mt-1 text-right text-xs text-muted">
              {details.length}/1500 ký tự
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg font-medium text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || (reason !== 'copyright' && !user)}
              className="px-5 py-2 text-sm rounded-lg font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition shadow-sm"
            >
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

