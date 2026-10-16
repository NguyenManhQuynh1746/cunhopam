import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import SongItem, { SongItemData } from '@/components/song/SongItem';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bài hát đã lưu | cunhopam',
  description: 'Danh sách các bài hát bạn đã lưu yêu thích để luyện tập guitar.',
};

export default async function SavedSongsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-2xl font-bold text-ink">Bài hát đã lưu</h1>
        <p className="text-muted text-sm">Vui lòng cấu hình Supabase để sử dụng tính năng lưu bài hát.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/da-luu');
  }

  const { data: favs, error } = await supabase
    .from('favorites')
    .select(`
      created_at,
      song:songs (
        id, title, slug, key, chords, view_count,
        artists:artist_id ( name ),
        rhythms:rhythm_id ( name ),
        genres:genre_id ( name )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const savedSongs: SongItemData[] = (favs || [])
    .filter((f: any) => f.song)
    .map((f: any) => ({
      id: f.song.id,
      title: f.song.title,
      slug: f.song.slug,
      key: f.song.key,
      chords: f.song.chords,
      view_count: f.song.view_count,
      artist_name: f.song.artists?.name || null,
      rhythm_name: f.song.rhythms?.name || null,
      genre_name: f.song.genres?.name || null,
    }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1 pb-4 border-b border-line">
        <h1 className="text-2xl sm:text-3xl font-black text-ink">
          Bài hát đã lưu
        </h1>
        <p className="text-xs sm:text-sm text-muted">
          Những bài hát bạn đã bấm lưu để tiện tra cứu và luyện tập hàng ngày.
        </p>
      </div>

      {savedSongs.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-soft text-muted flex items-center justify-center mx-auto text-xl font-bold">
            ♥
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-ink">Chưa có bài hát nào được lưu</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Khi xem bài hát, hãy bấm nút &ldquo;Lưu bài hát&rdquo; để dễ dàng tìm lại tại đây bất cứ lúc nào.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-accent text-white font-bold text-xs hover:bg-accent-dark transition shadow-sm"
          >
            Khám phá danh sách bài hát
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {savedSongs.map((song, i) => (
            <SongItem key={song.id} song={song} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

