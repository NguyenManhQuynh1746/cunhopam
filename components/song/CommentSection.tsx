'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface CommentItem {
  id: string;
  song_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentSectionProps {
  songId: string;
  initialComments: CommentItem[];
  user: User | null;
  songSlug: string;
}

export default function CommentSection({
  songId,
  initialComments,
  user,
  songSlug,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (confirm('Vui lòng đăng nhập để gửi bình luận. Đến trang đăng nhập ngay?')) {
        router.push(`/login?next=/bai-hat/${songSlug}`);
      }
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return;

    if (trimmed.length > 1000) {
      setErrorMsg('Bình luận không được vượt quá 1.000 ký tự.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('comments')
        .insert({
          song_id: songId,
          user_id: user.id,
          content: trimmed,
        })
        .select(`
          id,
          song_id,
          user_id,
          content,
          created_at,
          profile:profiles(display_name, avatar_url)
        `)
        .single();

      if (error) {
        // Postgres trigger rate limit error message
        if (error.message.includes('quá nhanh') || error.message.includes('rate_limit')) {
          setErrorMsg('Bạn đang bình luận quá nhanh. Tối đa 5 bình luận mỗi phút.');
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      if (data) {
        // Cast single object or array
        const newComment: CommentItem = {
          id: data.id,
          song_id: data.song_id,
          user_id: data.user_id,
          content: data.content,
          created_at: data.created_at,
          profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
        };
        setComments([newComment, ...comments]);
        setContent('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi bình luận';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Bạn có chắc muốn xoá bình luận này?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xoá bình luận';
      alert(msg);
    }
  };

  return (
    <section className="mt-12 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <h3 className="text-xl font-bold text-foreground">
          Bình luận <span className="text-sm font-normal text-muted">({comments.length})</span>
        </h3>
      </div>

      {/* Form bình luận */}
      <form onSubmit={handlePostComment} className="mt-4">
        {errorMsg && (
          <div className="mb-3 p-3 rounded-lg text-sm bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {errorMsg}
          </div>
        )}

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              user
                ? 'Viết bình luận, góp ý cách đệm hoặc hỏi hợp âm...'
                : 'Đăng nhập để tham gia thảo luận cùng cộng đồng...'
            }
            rows={3}
            maxLength={1000}
            disabled={submitting}
            className="w-full rounded-xl border border-border bg-background p-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none placeholder:text-muted"
          />
          <div className="absolute right-3 bottom-3 text-xs text-muted">
            {content.length}/1000
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition shadow-sm"
          >
            {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
          </button>
        </div>
      </form>

      {/* Danh sách bình luận */}
      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted italic py-4 text-center">
            Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nghĩ!
          </p>
        ) : (
          comments.map((c) => {
            const isAuthor = user?.id === c.user_id;
            const authorName = c.profile?.display_name || 'Thành viên Cunhopam';
            const dateStr = new Date(c.created_at).toLocaleDateString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={c.id}
                className="group rounded-xl border border-border bg-background/50 p-4 transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-foreground">
                        {authorName}
                      </span>
                      <span className="ml-2 text-xs text-muted">{dateStr}</span>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-rose-500 hover:text-rose-700 transition p-1"
                      aria-label="Xoá bình luận"
                    >
                      Xoá
                    </button>
                  )}
                </div>

                {/* An toàn XSS tuyệt đối: chỉ render text chuẩn với whitespace-pre-wrap, tuyệt đối không dùng dangerouslySetInnerHTML */}
                <div className="mt-2.5 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                  {c.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

