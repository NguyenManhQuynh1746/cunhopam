import React from 'react';
import Link from 'next/link';
import { parseChordPro } from '@/lib/chordpro';
import fs from 'fs';
import path from 'path';

// Đọc 3 bài hát mẫu public domain từ data/songs/
function getSampleSongs() {
  const songsDir = path.resolve(process.cwd(), 'data/songs');
  if (!fs.existsSync(songsDir)) return [];

  const files = ['amazing-grace.cho', 'auld-lang-syne.cho', 'greensleeves.cho'];
  const songs = [];

  for (const f of files) {
    const p = path.join(songsDir, f);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      const res = parseChordPro(content);
      if (res.success && res.song) {
        songs.push(res.song);
      }
    }
  }

  return songs;
}

export default function HomePage() {
  const sampleSongs = getSampleSongs();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="space-y-3">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight max-w-xl">
          Thư viện hợp âm cho người chơi guitar
        </h1>
        <p className="text-base sm:text-lg text-muted max-w-2xl">
          Tra cứu bài hát có hợp âm chuẩn, đổi tông theo giọng hát, xem sơ đồ ngón bấm trực quan và lưu trữ playlist riêng.
        </p>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Cột chính: Danh sách bài hát mẫu */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Bài hát mẫu hợp pháp (Public Domain)</h2>
            <span className="text-xs font-semibold text-muted bg-soft px-3 py-1 rounded-full">
              {sampleSongs.length} bài hát
            </span>
          </div>

          <div className="space-y-3">
            {sampleSongs.map((song, i) => (
              <div
                key={song.slug}
                className="bg-surface border border-line hover:border-accent rounded-2xl p-4 sm:p-5 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-soft text-muted font-black text-sm flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-ink leading-snug">
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted">
                        Nghệ sĩ / Tác giả: <strong className="text-ink">{song.artist}</strong> • Tông gốc: <strong>{song.key}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="bg-pick text-[#101828] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                      Điệu {song.rhythm || 'Chưa rõ'}
                    </span>
                    <span className="text-[10px] text-muted font-medium bg-soft px-2 py-0.5 rounded-full">
                      Public Domain
                    </span>
                  </div>
                </div>

                {/* Danh sách hợp âm trong bài */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted font-medium mr-1">Hợp âm:</span>
                  {song.chords.map(c => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-soft hover:bg-accent hover:text-ai text-xs font-bold rounded-lg text-ink transition-colors"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                {/* Đoạn trích lời bài hát mẫu */}
                <div className="bg-bg/60 border border-line rounded-xl p-3 text-xs text-muted font-mono whitespace-pre-line leading-relaxed overflow-x-auto">
                  {song.content.split('\n\n')[0]}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cột phụ: Bộ lọc & Gợi ý */}
        <aside className="space-y-4">
          <div className="bg-surface border border-line rounded-3xl p-5 space-y-3">
            <h3 className="text-base font-bold text-ink">Bản quyền & Nội dung</h3>
            <p className="text-xs text-muted leading-relaxed">
              Cunhopam tuân thủ nghiêm ngặt quyền sở hữu trí tuệ, chỉ sử dụng dữ liệu tự soạn và bài hát thuộc phạm vi công cộng (Public Domain).
            </p>
            <div className="pt-1 text-xs text-muted">
              Xem hướng dẫn đóng góp bài hát tại <strong className="text-ink">data/songs/</strong>.
            </div>
          </div>

          <div className="bg-surface border border-line rounded-3xl p-5 space-y-3">
            <h3 className="text-base font-bold text-ink">Chưa biết chơi bài nào?</h3>
            <p className="text-xs text-muted leading-relaxed">
              Chọn các hợp âm bạn đã bấm được, cunhopam sẽ gợi ý ngay những bài hát vừa sức.
            </p>
            <Link
              href="/find"
              className="inline-block bg-accent hover:bg-accent-dark text-ai text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Tìm theo hợp âm
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
