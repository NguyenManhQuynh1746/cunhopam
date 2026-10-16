import React from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import ChordProEditor from '@/components/song/ChordProEditor';
import { updateSongAction } from '@/lib/songs/actions';
import { Info } from 'lucide-react';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Chỉnh sửa bài hát | cunhopam`,
  };
}

export default async function EditSongPage({ params }: Props) {
  const { slug } = await params;

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/sua-bai/${slug}`);
  }

  // Lấy quyền của người dùng
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Lấy dữ liệu bài hát
  const { data: song } = await supabase
    .from('songs')
    .select(`
      id, title, slug, key, content, license_type, rights_holder,
      source_url, license_note, is_verified, takedown_status, created_by,
      artists:artist_id ( name ),
      rhythms:rhythm_id ( name ),
      genres:genre_id ( name )
    `)
    .eq('slug', slug)
    .single();

  if (!song) {
    notFound();
  }

  // Chỉ cho phép tác giả bài hát hoặc Admin chỉnh sửa
  if (song.created_by !== user.id && !isAdmin) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Chỉnh sửa bài hát: {song.title}
        </h1>
        <p className="text-muted text-xs sm:text-sm">
          Cập nhật lời bài hát, bổ sung hợp âm hoặc điều chỉnh thông tin nhạc lý.
        </p>
      </div>

      {song.is_verified && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs sm:text-sm text-purple-800 dark:text-purple-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <strong>Lưu ý về bài hát đã duyệt:</strong> Bài hát này hiện đang hiển thị công khai. Khi bạn lưu bản chỉnh sửa mới, hệ thống sẽ tạo một phiên bản chờ duyệt (pending revision). Bài hát gốc vẫn sẽ tiếp tục hiển thị bình thường cho đến khi ban quản trị xem xét và phê duyệt nội dung mới.
          </div>
        </div>
      )}

      <ChordProEditor
        mode="edit"
        initialData={{
          id: song.id,
          title: song.title,
          artist_name: (song.artists as any)?.name || '',
          key: song.key || 'C',
          content: song.content,
          rhythm_name: (song.rhythms as any)?.name || '',
          genre_name: (song.genres as any)?.name || '',
          license_type: song.license_type,
          rights_holder: song.rights_holder || '',
          source_url: song.source_url || '',
          license_note: song.license_note || '',
          is_verified: song.is_verified,
          slug: song.slug,
        }}
        onSubmit={async (data) => {
          'use server';
          return await updateSongAction({
            songId: song.id,
            title: data.title,
            key: data.key,
            content: data.content,
            reason: data.reason,
          });
        }}
      />
    </div>
  );
}

