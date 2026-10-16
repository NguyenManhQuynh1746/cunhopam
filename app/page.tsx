import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import SongItem, { SongItemData } from '@/components/song/SongItem';
import SearchInput from '@/components/home/SearchInput';
import Tabs from '@/components/home/Tabs';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 15;

export default async function HomePage({ searchParams }: HomePageProps) {
  const { tab = 'today', q = '', page = '1' } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  let songs: SongItemData[] = [];
  let totalCount = 0;
  let rhythms: { name: string; slug: string }[] = [];
  let genres: { name: string; slug: string }[] = [];
  let isFromDatabase = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // 1. Lấy danh sách điệu và thể loại để hiển thị bộ lọc
      const [{ data: rData }, { data: gData }] = await Promise.all([
        supabase.from('rhythms').select('name, slug').order('name'),
        supabase.from('genres').select('name, slug').order('name'),
      ]);

      if (rData) rhythms = rData;
      if (gData) genres = gData;

      // 2. Tra cứu bài hát: Tìm kiếm không dấu RPC search_songs hoặc Tab Hot RPC get_hot_songs
      if (q.trim()) {
        const { data, error } = await supabase.rpc('search_songs', {
          p_query: q.trim(),
          p_limit: PAGE_SIZE,
          p_offset: offset,
        });

        if (!error && data) {
          songs = data;
          totalCount = data.length > 0 ? Number(data[0].total_count) : 0;
          isFromDatabase = true;
        }
      } else {
        const { data, error } = await supabase.rpc('get_hot_songs', {
          p_time_frame: tab,
          p_limit: PAGE_SIZE,
          p_offset: offset,
        });

        if (!error && data) {
          songs = data;
          totalCount = data.length > 0 ? Number(data[0].total_count) : 0;
          isFromDatabase = true;
        }
      }

      // Fallback nếu chưa chạy RPC migration
      if (!isFromDatabase) {
        let query = supabase
          .from('songs')
          .select(`
            id, title, slug, key, chords, view_count, published_at,
            artists:artist_id ( name ),
            rhythms:rhythm_id ( name ),
            genres:genre_id ( name )
          `, { count: 'exact' })
          .eq('is_verified', true)
          .eq('takedown_status', 'none');

        if (q.trim()) {
          query = query.ilike('title', `%${q.trim()}%`);
        }

        const { data: fallbackData, count } = await query
          .order('view_count', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (fallbackData) {
          songs = fallbackData.map((item: any) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            key: item.key,
            chords: item.chords,
            view_count: item.view_count,
            artist_name: item.artists?.name || null,
            rhythm_name: item.rhythms?.name || null,
            genre_name: item.genres?.name || null,
          }));
          totalCount = count || fallbackData.length;
          isFromDatabase = true;
        }
      }
    } catch (err) {
      console.error('Error querying Supabase home songs:', err);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="space-y-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-ink leading-tight">
            Thư viện hợp âm guitar
          </h1>
          <p className="text-sm sm:text-base text-muted">
            Tra cứu bài hát có hợp âm chuẩn, đổi tông theo giọng ca, xem sơ đồ bấm ngón trực quan và lưu trữ bài hát yêu thích.
          </p>
        </div>

        {/* Ô tìm kiếm lớn với debounce 300ms và không phân biệt dấu */}
        <div className="max-w-2xl">
          <SearchInput initialQuery={q} />
        </div>
      </section>

      {/* Main Grid: Danh sách & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cột chính: Tab & Danh sách bài hát */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-line">
            {!q.trim() ? (
              <Tabs currentTab={tab} />
            ) : (
              <div className="text-sm font-semibold text-ink">
                Kết quả tìm kiếm cho: &ldquo;<span className="text-accent">{q}</span>&rdquo;
              </div>
            )}

            <span className="text-xs font-semibold text-muted bg-soft px-3 py-1 rounded-full">
              {totalCount} bài hát
            </span>
          </div>

          {songs.length === 0 ? (
            <div className="rounded-3xl border border-line bg-surface p-12 text-center space-y-3">
              <p className="text-base font-semibold text-ink">
                Không tìm thấy bài hát nào phù hợp.
              </p>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Thử tìm bằng từ khoá không dấu (ví dụ: &ldquo;pho nho&rdquo;), hoặc xoá bớt từ tìm kiếm.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map((song, i) => (
                <SongItem key={song.id} song={song} index={offset + i} />
              ))}
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              {currentPage > 1 && (
                <Link
                  href={`/?tab=${tab}&q=${encodeURIComponent(q)}&page=${currentPage - 1}`}
                  className="px-4 py-2 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:border-accent transition"
                >
                  ← Trang trước
                </Link>
              )}
              <span className="text-xs font-medium text-muted px-2">
                Trang {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/?tab=${tab}&q=${encodeURIComponent(q)}&page=${currentPage + 1}`}
                  className="px-4 py-2 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:border-accent transition"
                >
                  Trang sau →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Cột Sidebar: Bộ lọc Điệu, Thể loại & Gợi ý */}
        <aside className="space-y-6">
          {/* Lọc theo Điệu nhạc */}
          <div className="rounded-3xl border border-line bg-surface p-5 space-y-3">
            <h3 className="text-sm font-black text-ink uppercase tracking-wider">
              Điệu bài hát
            </h3>
            <div className="flex flex-wrap gap-2">
              {rhythms.map((r) => (
                <Link
                  key={r.slug}
                  href={`/dieu/${r.slug}`}
                  className="text-xs px-3 py-1.5 rounded-xl border border-line bg-bg text-ink font-semibold hover:border-accent hover:text-accent transition shadow-xs"
                >
                  {r.name}
                </Link>
              ))}
              {rhythms.length === 0 && (
                <span className="text-xs text-muted italic">Đang cập nhật...</span>
              )}
            </div>
          </div>

          {/* Lọc theo Thể loại */}
          <div className="rounded-3xl border border-line bg-surface p-5 space-y-3">
            <h3 className="text-sm font-black text-ink uppercase tracking-wider">
              Thể loại
            </h3>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <Link
                  key={g.slug}
                  href={`/the-loai/${g.slug}`}
                  className="text-xs px-3 py-1.5 rounded-xl border border-line bg-bg text-ink font-semibold hover:border-accent hover:text-accent transition shadow-xs"
                >
                  {g.name}
                </Link>
              ))}
              {genres.length === 0 && (
                <span className="text-xs text-muted italic">Đang cập nhật...</span>
              )}
            </div>
          </div>

          {/* Gợi ý Tìm theo hợp âm */}
          <div className="rounded-3xl border border-line bg-surface p-5 space-y-3">
            <h3 className="text-base font-bold text-ink">Chưa biết chơi bài nào?</h3>
            <p className="text-xs text-muted leading-relaxed">
              Chọn các hợp âm bạn đã thành thạo, cunhopam sẽ gợi ý ngay danh sách bài hát vừa sức.
            </p>
            <Link
              href="/find"
              className="inline-block bg-accent hover:bg-accent-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              Tìm bài theo hợp âm đã biết
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
