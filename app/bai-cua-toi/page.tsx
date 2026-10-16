import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  FileMusic,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit,
  ShieldAlert,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bài hát của tôi | cunhopam',
  description: 'Danh sách các bài hát do bạn đóng góp và trạng thái kiểm duyệt.',
};

export const dynamic = 'force-dynamic';

export default async function MySongsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted">
        Cơ sở dữ liệu Supabase chưa được cấu hình.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/bai-cua-toi');
  }

  // Truy vấn danh sách bài hát do người dùng đăng
  const { data: songs, error } = await supabase
    .from('songs')
    .select(`
      id, title, slug, key, license_type, is_verified, takedown_status,
      rejection_reason, created_at, published_at, view_count,
      artists:artist_id ( name ),
      revisions:song_revisions ( id, status, created_at )
    `)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
            <FileMusic className="w-8 h-8 text-accent" />
            <span>Bài hát của tôi</span>
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Theo dõi trạng thái kiểm duyệt và chỉnh sửa các bài hát bạn đã đóng góp cho cunhopam.
          </p>
        </div>

        <Link
          href="/dang-bai"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent hover:bg-accent-dark text-ai text-sm font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Đăng bài mới</span>
        </Link>
      </div>

      {(!songs || songs.length === 0) ? (
        <div className="text-center py-16 border border-line border-dashed rounded-3xl bg-surface p-6 space-y-3">
          <FileMusic className="w-12 h-12 text-muted mx-auto stroke-[1.5]" />
          <h3 className="font-bold text-ink">Bạn chưa đăng bài hát nào</h3>
          <p className="text-muted text-xs sm:text-sm max-w-md mx-auto">
            Hãy cùng chia sẻ hợp âm các bài hát yêu thích với cộng đồng người chơi guitar và ukulele ngay hôm nay!
          </p>
          <div className="pt-2">
            <Link
              href="/dang-bai"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent hover:bg-accent-dark text-ai text-xs sm:text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng bài đầu tiên</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {songs.map((song: any) => {
            const hasPendingRevision = (song.revisions || []).some((r: any) => r.status === 'pending');
            const isRemoved = song.takedown_status !== 'none';
            const isRejected = !song.is_verified && song.rejection_reason;
            const isVerified = song.is_verified && !isRemoved;
            const isPending = !song.is_verified && !isRejected && !isRemoved;

            return (
              <div
                key={song.id}
                className="bg-surface border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 hover:border-line-hover transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/bai-hat/${song.slug}`}
                        className="text-base sm:text-lg font-bold text-ink hover:text-accent transition"
                      >
                        {song.title}
                      </Link>

                      {/* Huy hiệu trạng thái */}
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Đã duyệt công khai</span>
                        </span>
                      )}

                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Chờ kiểm duyệt</span>
                        </span>
                      )}

                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Bị từ chối duyệt</span>
                        </span>
                      )}

                      {isRemoved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Gỡ bỏ do khiếu nại</span>
                        </span>
                      )}

                      {hasPendingRevision && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Có bản sửa chờ duyệt</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>Nghệ sĩ: <strong className="text-ink">{song.artists?.name || 'Chưa cập nhật'}</strong></span>
                      <span>•</span>
                      <span>Tông: <strong className="text-ink font-mono">{song.key}</strong></span>
                      <span>•</span>
                      <span>Ngày gửi: {new Date(song.created_at).toLocaleDateString('vi-VN')}</span>
                      {isVerified && (
                        <>
                          <span>•</span>
                          <span>Lượt xem: {song.view_count || 0}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/bai-hat/${song.slug}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-ink hover:border-accent hover:text-accent transition"
                    >
                      <span>Xem bài</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <Link
                      href={`/sua-bai/${song.slug}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-xs font-semibold text-accent hover:bg-accent hover:text-white transition"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Sửa bài</span>
                    </Link>
                  </div>
                </div>

                {/* Nếu bài bị từ chối, hiển thị rõ lý do từ admin */}
                {isRejected && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Lý do từ chối kiểm duyệt từ ban quản trị:</span>
                    </div>
                    <p className="pl-5 text-ink/90">
                      {song.rejection_reason}
                    </p>
                    <p className="pl-5 text-muted text-[11px] pt-1">
                      Bạn có thể bấm <strong>"Sửa bài"</strong> để điều chỉnh lại theo yêu cầu và gửi duyệt lại.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

