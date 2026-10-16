import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import SongItem, { SongItemData } from '@/components/song/SongItem';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: `Bài hát điệu ${decodeURIComponent(slug)} | cunhopam`,
  };
}

export default async function RhythmPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  if (!isSupabaseConfigured()) {
    return notFound();
  }

  const supabase = await createClient();

  // 1. Tìm thông tin điệu nhạc
  const { data: rhythm } = await supabase
    .from('rhythms')
    .select('id, name, slug, time_signature, tempo_hint')
    .eq('slug', decodedSlug)
    .maybeSingle();

  if (!rhythm) {
    notFound();
  }

  // 2. Lấy danh sách bài hát thuộc điệu này
  const { data: songsData } = await supabase
    .from('songs')
    .select(`
      id, title, slug, key, chords, view_count,
      artists:artist_id ( name ),
      genres:genre_id ( name )
    `)
    .eq('rhythm_id', rhythm.id)
    .eq('is_verified', true)
    .eq('takedown_status', 'none')
    .order('view_count', { ascending: false });

  const songs: SongItemData[] = (songsData || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    key: item.key,
    chords: item.chords,
    view_count: item.view_count,
    artist_name: item.artists?.name || null,
    rhythm_name: rhythm.name,
    genre_name: item.genres?.name || null,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2 pb-4 border-b border-line">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-accent">Trang chủ</Link>
          <span>/</span>
          <span>Điệu nhạc</span>
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-ink">
            Điệu {rhythm.name}
          </h1>
          {rhythm.time_signature && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-accent/10 text-accent">
              Nhịp {rhythm.time_signature}
            </span>
          )}
        </div>
        {rhythm.tempo_hint && (
          <p className="text-xs sm:text-sm text-muted">
            Gợi ý tiết tấu: {rhythm.tempo_hint}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted font-semibold">
          <span>Danh sách bài hát ({songs.length})</span>
        </div>

        {songs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center text-xs text-muted">
            Chưa có bài hát nào được gán điệu này.
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song, i) => (
              <SongItem key={song.id} song={song} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

