import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import ChordMatrix from '@/components/chord/ChordMatrix';
import { chordToSlug } from '@/lib/chords/slug';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Thư viện hợp âm Guitar & Ukulele | cunhopam',
  description: 'Tra cứu tất cả thế bấm hợp âm guitar và ukulele, sơ đồ ngón tay, nốt cấu thành và âm thanh nghe thử.',
};

const POPULAR_CHORDS = ['C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'E', 'Dm', 'Bm', 'Bb', 'C7'];

export default async function ChordsLibraryPage() {
  const availableSet = new Set<string>();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from('chords')
        .select('root, suffix')
        .eq('instrument', 'guitar');

      if (data) {
        for (const row of data) {
          availableSet.add(`${row.root}_${row.suffix}`);
        }
      }
    } catch (err) {
      console.error('Error fetching chords from Supabase:', err);
    }
  }

  // Fallback đọc từ chords-db nếu database chưa có
  if (availableSet.size === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const guitarDb = require('@tombatossals/chords-db/lib/guitar.json');
      for (const rootKey of Object.keys(guitarDb.chords)) {
        for (const item of guitarDb.chords[rootKey]) {
          availableSet.add(`${item.key}_${item.suffix}`);
        }
      }
    } catch (e) {
      console.warn('Fallback chords-db read error:', e);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header giới thiệu */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
          Thư viện thế bấm hợp âm
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-3xl">
          Tra cứu sơ đồ thế bấm guitar và ukulele cho 12 họ nốt gốc và đầy đủ các biến thể hợp âm (trưởng, thứ, 7, maj7, m7, sus4, dim...). Bấm vào hợp âm để xem chi tiết ngón tay và nghe thử tiếng đàn.
        </p>
      </div>

      {/* Hợp âm phổ biến (Quick Access) */}
      <div className="p-5 rounded-3xl bg-surface border border-line space-y-3 shadow-xs">
        <h2 className="text-xs font-black text-muted uppercase tracking-wider">
          Hợp âm phổ biến cho người mới bắt đầu
        </h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR_CHORDS.map((c) => {
            const slug = chordToSlug(c);
            return (
              <Link
                key={c}
                href={`/hop-am/${slug}`}
                className="px-4 py-2 rounded-xl bg-bg border border-line hover:border-accent hover:text-accent font-black text-sm text-ink transition shadow-xs flex items-center gap-1 active:scale-95"
              >
                <span>{c}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bảng chọn 12 nốt x loại hợp âm */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-ink">
          Bảng tra cứu hợp âm toàn diện
        </h2>
        <ChordMatrix availableChords={availableSet} />
      </div>
    </div>
  );
}

