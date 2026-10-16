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
    title: `Hợp âm ca sĩ / nhạc sĩ ${decodeURIComponent(slug)} | cunhopam`,
  };
}

export default async function ArtistPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  if (!isSupabaseConfigured()) {
    return notFound();
  }

  const supabase = await createClient();

  // 1. Tìm nghệ sĩ / tác giả
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, slug, bio, avatar_url')
    .eq('slug', decodedSlug)
    .maybeSingle();

  if (!artist) {
    notFound();
  }

  // 2. Lấy danh sách bài hát
  const { data: songsData } = await supabase
    .from('songs')
    .select(`
      id, title, slug, key, chords, view_count,
      rhythms:rhythm_id ( name ),
      genres:genre_id ( name )
    `)
    .eq('artist_id', artist.id)
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
    artist_name: artist.name,
    rhythm_name: item.rhythms?.name || null,
    genre_name: item.genres?.name || null,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2 pb-4 border-b border-line">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-accent">Trang chủ</Link>
          <span>/</span>
          <span>Nghệ sĩ</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent font-black text-2xl flex items-center justify-center shrink-0">
            {artist.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink">
              {artist.name}
            </h1>
            {artist.bio && (
              <p className="text-xs sm:text-sm text-muted mt-1">
                {artist.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted font-semibold">
          <span>Tất cả bài hát ({songs.length})</span>
        </div>

        {songs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center text-xs text-muted">
            Chưa có bài hát nào của nghệ sĩ này.
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

