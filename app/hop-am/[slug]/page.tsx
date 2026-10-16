import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { slugToChord } from '@/lib/chords/slug';
import { parseChord } from '@/lib/chords/parser';
import { getChordNotes } from '@/lib/chords/notes';
import { normalizeChordName } from '@/lib/chords/normalize';
import ChordDetailViewer from '@/components/chord/ChordDetailViewer';
import { SongItemData } from '@/components/song/SongItem';
import { ChordPositionProps } from '@/components/chord/ChordDiagramSvg';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const chordName = slugToChord(slug);

  if (!chordName) {
    return { title: 'Không tìm thấy hợp âm | cunhopam' };
  }

  return {
    title: `Hợp âm ${chordName} – Thế bấm Guitar & Ukulele chuẩn | cunhopam`,
    description: `Xem tất cả thế bấm hợp âm ${chordName}, số ngón tay, nốt cấu thành và nghe thử âm thanh guitar/ukulele.`,
  };
}

export default async function ChordDetailPage({ params }: Props) {
  const { slug } = await params;
  const chordName = slugToChord(slug);

  if (!chordName) {
    notFound();
  }

  const parsed = parseChord(chordName);
  if (!parsed) {
    notFound();
  }

  const root = parsed.rootText;
  const suffix = parsed.qualityKey || 'major';
  const normChord = normalizeChordName(chordName);

  let guitarPositions: ChordPositionProps[] = [];
  let ukulelePositions: ChordPositionProps[] = [];
  let relatedSongs: SongItemData[] = [];

  // 1. Tìm trong Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // Truy vấn thế bấm Guitar & Ukulele
      const { data: chordRows } = await supabase
        .from('chords')
        .select('instrument, positions')
        .eq('root', root)
        .eq('suffix', suffix);

      if (chordRows && chordRows.length > 0) {
        for (const row of chordRows) {
          if (row.instrument === 'guitar' && Array.isArray(row.positions)) {
            guitarPositions = row.positions;
          } else if (row.instrument === 'ukulele' && Array.isArray(row.positions)) {
            ukulelePositions = row.positions;
          }
        }
      }

      // Truy vấn các bài hát có sử dụng hợp âm này (qua bảng song_chords)
      const { data: songChordsData } = await supabase
        .from('song_chords')
        .select(`
          song:songs (
            id, title, slug, key, chords, view_count,
            artists:artist_id ( name ),
            rhythms:rhythm_id ( name ),
            genres:genre_id ( name )
          )
        `)
        .eq('chord_name', normChord)
        .limit(20);

      if (songChordsData) {
        relatedSongs = songChordsData
          .filter((item: any) => item.song)
          .map((item: any) => ({
            id: item.song.id,
            title: item.song.title,
            slug: item.song.slug,
            key: item.song.key,
            chords: item.song.chords,
            view_count: item.song.view_count,
            artist_name: item.song.artists?.name || null,
            rhythm_name: item.song.rhythms?.name || null,
            genre_name: item.song.genres?.name || null,
          }));
      }
    } catch (err) {
      console.error('Error querying Supabase for chord detail:', err);
    }
  }

  // 2. Fallback đọc từ chords-db nếu database chưa có đủ
  if (guitarPositions.length === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const guitarDb = require('@tombatossals/chords-db/lib/guitar.json');
      for (const rootKey of Object.keys(guitarDb.chords)) {
        const list = guitarDb.chords[rootKey] || [];
        const match = list.find((x: any) => (x.key === root || x.key === normChord) && x.suffix === suffix);
        if (match) {
          guitarPositions = match.positions;
          break;
        }
      }
    } catch (e) {
      console.warn('Fallback guitar chords-db error:', e);
    }
  }

  if (ukulelePositions.length === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ukeDb = require('@tombatossals/chords-db/lib/ukulele.json');
      for (const rootKey of Object.keys(ukeDb.chords)) {
        const list = ukeDb.chords[rootKey] || [];
        const match = list.find((x: any) => (x.key === root || x.key === normChord) && x.suffix === suffix);
        if (match) {
          ukulelePositions = match.positions;
          break;
        }
      }
    } catch (e) {
      console.warn('Fallback ukulele chords-db error:', e);
    }
  }

  // Nếu cả hai nguồn đều không có thế bấm nào cho hợp âm này thì 404
  if (guitarPositions.length === 0 && ukulelePositions.length === 0) {
    notFound();
  }

  // 3. Tính toán nốt cấu thành đúng chuẩn nhạc lý
  const constituentNotes = getChordNotes(chordName);

  return (
    <ChordDetailViewer
      chordName={chordName}
      guitarPositions={guitarPositions}
      ukulelePositions={ukulelePositions}
      notes={constituentNotes}
      songs={relatedSongs}
    />
  );
}
