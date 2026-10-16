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
    title: `Thể loại ${decodeURIComponent(slug)} | cunhopam`,
  };
}

export default async function GenrePage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  if (!isSupabaseConfigured()) {
    return notFound();
  }

  const supabase = await createClient();

  // 1. Tìm thể loại
  const { data: genre } = await supabase
    .from('genres')
    .select('id, name, slug, description')
    .eq('slug', decodedSlug)
    .maybeSingle();

  if (!genre) {
    notFound();
  }

  // 2. Lấy danh sách bài hát
  const { data: songsData } = await supabase
    .from('songs')
    .select(`
      id, title, slug, key, chords, view_count,
      artists:artist_id ( name ),
      rhythms:rhythm_id ( name )
    `)
    .eq('genre_id', genre.id)
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
    rhythm_name: item.rhythms?.name || null,
    genre_name: genre.name,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2 pb-4 border-b border-line">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-accent">Trang chủ</Link>
          <span>/</span>
          <span>Thể loại</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-ink">
          Thể loại {genre.name}
        </h1>
        {genre.description && (
          <p className="text-xs sm:text-sm text-muted">
            {genre.description}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted font-semibold">
          <span>Danh sách bài hát ({songs.length})</span>
        </div>

        {songs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center text-xs text-muted">
            Chưa có bài hát nào thuộc thể loại này.
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

