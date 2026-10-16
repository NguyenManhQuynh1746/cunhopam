import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { parseChordPro } from '@/lib/chordpro';
import SongViewer, { SongDetailData } from '@/components/song/SongViewer';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Hợp âm bài hát | cunhopam`,
    description: `Xem hợp âm chuẩn, đổi tông, xem thế bấm và nghe thử âm thanh guitar.`,
  };
}

export default async function SongDetailPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  let songData: SongDetailData | null = null;
  const preloadedChords: Record<string, any[]> = {};
  let user = null;
  let isFavorited = false;
  let comments: any[] = [];

  // 1. Tìm trong Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // Kiểm tra user đăng nhập
      const { data: authData } = await supabase.auth.getUser();
      user = authData?.user || null;

      const { data, error } = await supabase
        .from('songs')
        .select(`
          id, title, slug, key, content, chords, license_type, rights_holder, source_url, license_note, view_count, is_verified, takedown_status, created_at, published_at,
          artists:artist_id ( name, slug ),
          rhythms:rhythm_id ( name, slug ),
          genres:genre_id ( name, slug )
        `)
        .eq('slug', decodedSlug)
        .maybeSingle();

      if (data && !error) {
        songData = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          key: data.key || 'C',
          content: data.content,
          chords: Array.isArray(data.chords) ? data.chords : [],
          license_type: data.license_type,
          rights_holder: data.rights_holder,
          source_url: data.source_url,
          license_note: data.license_note,
          view_count: data.view_count || 0,
          is_verified: data.is_verified,
          takedown_status: data.takedown_status,
          created_at: data.created_at,
          published_at: data.published_at,
          artist_name: (data.artists as any)?.name || null,
          artist_slug: (data.artists as any)?.slug || null,
          rhythm_name: (data.rhythms as any)?.name || null,
          rhythm_slug: (data.rhythms as any)?.slug || null,
          genre_name: (data.genres as any)?.name || null,
          genre_slug: (data.genres as any)?.slug || null,
        };

        // Kiểm tra xem user đã yêu thích bài này chưa
        if (user) {
          const { data: fav } = await supabase
            .from('favorites')
            .select('song_id')
            .eq('user_id', user.id)
            .eq('song_id', songData.id)
            .maybeSingle();
          isFavorited = !!fav;
        }

        // Lấy danh sách bình luận
        const { data: commentList } = await supabase
          .from('comments')
          .select('id, song_id, user_id, content, created_at')
          .eq('song_id', songData.id)
          .order('created_at', { ascending: false });

        if (commentList && commentList.length > 0) {
          const userIds = Array.from(new Set(commentList.map((c) => c.user_id)));
          const { data: userProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          const profileMap = new Map((userProfiles || []).map((p) => [p.id, p]));

          comments = commentList.map((c: any) => {
            const p = profileMap.get(c.user_id);
            return {
              id: c.id,
              song_id: c.song_id,
              user_id: c.user_id,
              content: c.content,
              created_at: c.created_at,
              profile: {
                display_name: p?.full_name || 'Thành viên',
                avatar_url: p?.avatar_url || null,
              },
            };
          });
        }

        // Preload toàn bộ các hợp âm guitar từ bảng chords
        const { data: chordRows } = await supabase
          .from('chords')
          .select('root, suffix, positions')
          .eq('instrument', 'guitar');

        if (chordRows) {
          for (const row of chordRows) {
            const chordName = row.suffix === 'major' ? row.root : `${row.root}${row.suffix}`;
            preloadedChords[chordName] = row.positions;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching song from Supabase:', err);
    }
  }

  // 2. Fallback đọc từ data/songs/ nếu không có trên DB
  if (!songData) {
    const songsDir = path.resolve(process.cwd(), 'data/songs');
    if (fs.existsSync(songsDir)) {
      const files = fs.readdirSync(songsDir).filter((f) => f.endsWith('.cho'));
      for (const file of files) {
        const fullPath = path.join(songsDir, file);
        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        const parsed = parseChordPro(rawContent);

        if (parsed.success && parsed.song && parsed.song.slug === decodedSlug) {
          songData = {
            id: 'local-' + parsed.song.slug,
            title: parsed.song.title,
            slug: parsed.song.slug,
            key: parsed.song.key,
            content: parsed.song.content,
            chords: parsed.song.chords,
            license_type: parsed.song.license,
            rights_holder: parsed.song.rightsHolder,
            source_url: parsed.song.source,
            license_note: parsed.song.licenseNote,
            view_count: 10,
            created_at: new Date().toISOString(),
            artist_name: parsed.song.artist,
            rhythm_name: parsed.song.rhythm,
            genre_name: parsed.song.genre,
          };
          break;
        }
      }
    }
  }

  if (!songData) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      <SongViewer
        song={songData}
        preloadedChords={preloadedChords}
        user={user}
        initialIsFavorited={isFavorited}
        initialComments={comments}
      />
    </div>
  );
}

