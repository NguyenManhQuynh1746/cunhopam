import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseChordPro, slugify } from '../lib/chordpro';
import { parseChord } from '../lib/chords/parser';
import { normalizeChordName } from '../lib/chords/normalize';

// Tải biến môi trường từ .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}
loadEnv();

const PROGRESS_FILE = path.resolve(process.cwd(), 'data/crawler-progress.json');
const SONGS_DIR = path.resolve(process.cwd(), 'data/songs');

// Danh sách các điệu phổ biến nhất trên HopAmChuan
const POPULAR_RHYTHMS = [
  'ballad',
  'slowrock',
  'pop',
  'bollero',
  'slow',
  'disco',
  'blue',
  'valse',
  'boston',
  'fox',
  'bossanova',
  'rock',
  'chachacha',
  'rhumba',
  'tango',
];

interface CrawlerProgress {
  crawledUrls: string[];
  totalSuccess: number;
  lastUpdated: string;
}

function loadProgress(): CrawlerProgress {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch {
      // fallback
    }
  }
  return {
    crawledUrls: [],
    totalSuccess: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function saveProgress(progress: CrawlerProgress) {
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

async function fetchWithRetry(url: string, retries = 3, delayMs = 1500): Promise<string> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://hopamchuan.com/',
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.text();
    } catch (err: any) {
      if (attempt === retries) throw err;
      console.warn(`   ⚠️ Thử lại (${attempt}/${retries}) URL: ${url} do lỗi: ${err.message}`);
      await sleep(delayMs * attempt);
    }
  }
  throw new Error('Unreachable');
}

export function parseSongPage(html: string, url: string) {
  // 1. Tiêu đề
  let title = '';
  const h1Match =
    html.match(/<h1[^>]*id="song-title"[^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    title = cleanHtmlEntities(h1Match[1].replace(/<[^>]+>/g, '').trim());
  }
  if (!title) {
    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i);
    if (ogTitle) {
      title = ogTitle[1].replace(/^Hợp\s*âm\s*/i, '').split('-')[0].trim();
    }
  }

  // 2. Nghệ sĩ biểu diễn / ca sĩ
  let artist = 'Không rõ';
  const artistMatch =
    html.match(/class="[^"]*author-item[^"]*"[^>]*href="[^"]*\/artist\/[^"]*"[^>]*>([^<]+)<\/a>/i) ||
    html.match(/class="author-item"[^>]*>([^<]+)<\/a>/i);
  if (artistMatch) {
    artist = cleanHtmlEntities(artistMatch[1].trim());
  }

  // 3. Nhạc sĩ / Sáng tác
  let composer = '';
  const composerMatch =
    html.match(/class="[^"]*author-item[^"]*"[^>]*href="[^"]*\/composer\/[^"]*"[^>]*>([^<]+)<\/a>/i) ||
    html.match(/href="[^"]*\/composer\/[^"]*"[^>]*>([^<]+)<\/a>/i);
  if (composerMatch) {
    composer = cleanHtmlEntities(composerMatch[1].trim());
  }

  // 4. Tone / Điệu
  let key = 'C';
  const keyMatch =
    html.match(/class="song-key"[^>]*>([^<]+)<\/span>/i) ||
    html.match(/data-key="([A-G][#b]?m?)"/i) ||
    html.match(/tone\s*\[([A-G][#b]?m?)\]/i);
  if (keyMatch) {
    key = keyMatch[1].trim();
  }

  // 5. Rhythm / Điệu nhạc
  let rhythm = 'Ballad';
  const rhythmMatch = html.match(/href="[^"]*\/rhythm\/v\/[^"]*"[^>]*>([^<]+)<\/a>/i);
  if (rhythmMatch) {
    const rawRhythm = cleanHtmlEntities(rhythmMatch[1].trim());
    rhythm = rawRhythm.replace(/^Điệu\s*/i, '').trim();
  }

  // 6. Thể loại
  let genre = 'Nhạc trẻ';
  const genreMatch = html.match(/href="[^"]*\/genre\/v\/[^"]*"[^>]*>([^<]+)<\/a>/i);
  if (genreMatch) {
    genre = cleanHtmlEntities(genreMatch[1].trim());
  }

  // 7. Chuyển đổi dòng lyric và hợp âm
  const lineMatches = Array.from(html.matchAll(/<div class="chord_lyric_line[^"]*">([\s\S]*?)<\/div>/gi));
  const rawLines: string[] = [];

  for (const m of lineMatches) {
    const lineHtml = m[1];
    let line = lineHtml
      .replace(
        /<span[^>]*class="[^"]*hopamchuan_chord_inline[^"]*"[^>]*>\s*<i>\[<\/i>\s*<span[^>]*class="[^"]*hopamchuan_chord[^"]*"[^>]*>([^<]+)<\/span>\s*<i>\]<\/i>\s*<\/span>/gi,
        '[$1]'
      )
      .replace(/<span[^>]*class="[^"]*hopamchuan_chord[^"]*"[^>]*>([^<]+)<\/span>/gi, '[$1]')
      .replace(/\[\[([^\]]+)\]\]/g, '[$1]')
      .replace(/<[^>]+>/g, '')
      .trimEnd();

    line = cleanHtmlEntities(line);

    // Bỏ qua dòng ghi chú tone của HopAmChuan nếu có
    if (/hợp âm chia ở tone/i.test(line)) {
      continue;
    }

    // Xử lý các cặp ngoặc vuông [...] không phải là hợp âm hợp lệ
    // Nếu là tiêu đề đoạn ([Intro], [Chorus], v.v.) hoặc nhãn, chuyển thành {comment: ...} hoặc text thường
    line = line.replace(/\[([^\]]+)\]/g, (originalMatch, innerText) => {
      const trimmed = innerText.trim();
      const parsed = parseChord(trimmed);
      if (parsed) {
        return `[${trimmed}]`;
      }
      // Không phải hợp âm: chuyển thành {comment: ...}
      return `{comment: ${trimmed}}`;
    });

    rawLines.push(line);
  }

  // Lắp ghép nội dung ChordPro chuẩn
  const metadataLines = [
    `{title: ${title}}`,
    `{artist: ${artist}}`,
    composer ? `{composer: ${composer}}` : null,
    `{key: ${key}}`,
    `{rhythm: ${rhythm}}`,
    `{genre: ${genre}}`,
    `{license: user_submitted}`,
    `{rights_holder: ${composer || artist}}`,
    `{source: ${url}}`,
    '',
  ].filter((l): l is string => l !== null);

  const chordProContent = metadataLines.join('\n') + '\n' + rawLines.join('\n');

  return {
    title,
    artist,
    composer,
    key,
    rhythm,
    genre,
    content: chordProContent,
  };
}

async function extractSongUrlsFromListing(html: string): Promise<string[]> {
  // Tìm các link bài hát: /song/<id>/<slug>
  const regex = /href="(https:\/\/hopamchuan\.com\/song\/(\d+)\/([^"/]+)\/?)"[^>]*class="[^"]*song-title[^"]*"/gi;
  const urls: string[] = [];
  const matches = html.matchAll(regex);
  for (const m of matches) {
    const fullUrl = m[1].replace(/#.*$/, '');
    if (!urls.includes(fullUrl)) {
      urls.push(fullUrl);
    }
  }
  return urls;
}

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const targetUrl = args.find((_, i) => args[i - 1] === '--url');
  const specifiedRhythm = args.find((_, i) => args[i - 1] === '--rhythm');
  const limitArg = args.find((_, i) => args[i - 1] === '--limit');
  const pagesArg = args.find((_, i) => args[i - 1] === '--pages');
  const isForce = args.includes('--force');

  const maxTotalSongs = limitArg ? parseInt(limitArg, 10) : 30;
  const maxPages = pagesArg ? parseInt(pagesArg, 10) : 3;

  console.log(`\n🚀 [CUNHOPAM - BỘ CÀO BÀI HÁT TỰ ĐỘNG TỪ HOPAMCHUAN.COM]`);
  console.log(`   - Giới hạn bài: ${maxTotalSongs} bài`);
  console.log(`   - Giới hạn trang / điệu: ${maxPages} trang`);
  console.log(`   - Bỏ qua bài đã cào: ${!isForce}`);

  // Chuẩn bị thư mục data/songs
  if (!fs.existsSync(SONGS_DIR)) {
    fs.mkdirSync(SONGS_DIR, { recursive: true });
  }

  // Kết nối Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  let supabase: any = null;
  if (supabaseUrl && serviceRoleKey && !supabaseUrl.includes('your-project')) {
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    console.log(`   - Kết nối Supabase: ✅ SẴN SÀNG (tự động đồng bộ vào database)`);
  } else {
    console.log(`   - Kết nối Supabase: ⚠️ Không có Service Key, chỉ lưu file .cho vào data/songs/`);
  }

  const progress = loadProgress();
  const crawledSet = new Set<string>(progress.crawledUrls);

  let songUrlsToProcess: string[] = [];

  if (targetUrl) {
    songUrlsToProcess = [targetUrl];
  } else {
    const rhythmsToCrawl = specifiedRhythm ? [specifiedRhythm] : POPULAR_RHYTHMS;
    console.log(`\n🔍 Đang thu thập danh sách bài hát từ các điệu: ${rhythmsToCrawl.slice(0, 5).join(', ')}...`);

    for (const rhythmName of rhythmsToCrawl) {
      if (songUrlsToProcess.length >= maxTotalSongs) break;

      for (let p = 0; p < maxPages; p++) {
        if (songUrlsToProcess.length >= maxTotalSongs) break;

        const offset = p * 10;
        const pageUrl =
          offset === 0
            ? `https://hopamchuan.com/rhythm/v/${rhythmName}`
            : `https://hopamchuan.com/rhythm/v/${rhythmName}?offset=${offset}`;

        try {
          const listHtml = await fetchWithRetry(pageUrl, 2, 1000);
          const urls = await extractSongUrlsFromListing(listHtml);
          for (const u of urls) {
            if (!isForce && crawledSet.has(u)) continue;
            if (!songUrlsToProcess.includes(u)) {
              songUrlsToProcess.push(u);
            }
            if (songUrlsToProcess.length >= maxTotalSongs) break;
          }
          await sleep(600);
        } catch (err: any) {
          console.warn(`   ⚠️ Lỗi tải trang danh sách ${pageUrl}: ${err.message}`);
        }
      }
    }
  }

  console.log(`\n📋 Đã tìm thấy ${songUrlsToProcess.length} bài hát cần cào.`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < songUrlsToProcess.length; i++) {
    const songUrl = songUrlsToProcess[i];
    console.log(`\n[${i + 1}/${songUrlsToProcess.length}] 🌐 Đang cào: ${songUrl}`);

    try {
      const html = await fetchWithRetry(songUrl, 3, 1200);
      const parsed = parseSongPage(html, songUrl);

      if (!parsed.title || parsed.title.length < 2) {
        console.warn(`   ⚠️ Tiêu đề bài hát không hợp lệ, bỏ qua.`);
        failCount++;
        continue;
      }

      // Kiểm tra tính hợp lệ bằng ChordPro parser
      const chordProCheck = parseChordPro(parsed.content);
      if (!chordProCheck.success || !chordProCheck.song) {
        console.warn(`   ⚠️ File ChordPro tạo ra có lỗi:`, chordProCheck.errors);
        failCount++;
        continue;
      }

      const song = chordProCheck.song;
      const baseSlug = slugify(song.title);
      const artistSlug = slugify(song.artist);
      const uniqueSlug = `${baseSlug}-${artistSlug}`.replace(/--+/g, '-');

      // 1. Lưu file .cho vào thư mục data/songs
      const filePath = path.join(SONGS_DIR, `${uniqueSlug}.cho`);
      fs.writeFileSync(filePath, parsed.content, 'utf-8');

      // 2. Nếu có Supabase, đồng bộ trực tiếp vào database với is_verified = true
      if (supabase) {
        // Đảm bảo Nghệ sĩ tồn tại
        let artistId: string | null = null;
        const { data: artistData } = await supabase
          .from('artists')
          .select('id')
          .eq('slug', artistSlug)
          .maybeSingle();

        if (artistData) {
          artistId = artistData.id;
        } else {
          const { data: newArtist, error: artErr } = await supabase
            .from('artists')
            .insert({ name: song.artist, slug: artistSlug })
            .select('id')
            .single();
          if (!artErr && newArtist) artistId = newArtist.id;
        }

        // Đảm bảo Điệu nhạc tồn tại
        let rhythmId: string | null = null;
        if (song.rhythm) {
          const rhythmSlug = slugify(song.rhythm);
          const { data: rhythmData } = await supabase
            .from('rhythms')
            .select('id')
            .eq('slug', rhythmSlug)
            .maybeSingle();

          if (rhythmData) {
            rhythmId = rhythmData.id;
          } else {
            const { data: newRhythm, error: rhyErr } = await supabase
              .from('rhythms')
              .insert({ name: song.rhythm, slug: rhythmSlug })
              .select('id')
              .single();
            if (!rhyErr && newRhythm) rhythmId = newRhythm.id;
          }
        }

        // Upsert bài hát với is_verified = true
        const songRecord = {
          title: song.title,
          slug: uniqueSlug,
          artist_id: artistId,
          rhythm_id: rhythmId,
          key: song.key,
          content: song.content,
          chords: song.chords,
          license_type: 'user_submitted',
          rights_holder: song.rightsHolder || song.artist,
          source_url: songUrl,
          is_verified: true,
          takedown_status: 'none',
          updated_at: new Date().toISOString(),
        };

        const { data: upsertedSong, error: songErr } = await supabase
          .from('songs')
          .upsert(songRecord, { onConflict: 'slug' })
          .select('id')
          .single();

        if (songErr) {
          console.error(`   ❌ Lỗi lưu bài hát vào database:`, songErr.message);
        } else if (upsertedSong) {
          // Liên kết song_artists
          if (artistId) {
            await supabase
              .from('song_artists')
              .upsert({ song_id: upsertedSong.id, artist_id: artistId, role: 'performer' });
          }

          // Điền bảng song_chords
          const chordMatches = Array.from(song.content.matchAll(/\[([^\]]+)\]/g));
          const normalizedChords = Array.from(
            new Set(
              chordMatches
                .map(m => normalizeChordName(m[1].trim()))
                .filter(c => c && c.length > 0)
            )
          );

          await supabase.from('song_chords').delete().eq('song_id', upsertedSong.id);
          if (normalizedChords.length > 0) {
            const chordRows = normalizedChords.map(chord_name => ({
              song_id: upsertedSong.id,
              chord_name,
            }));
            await supabase.from('song_chords').insert(chordRows);
          }
        }
      }

      // Cập nhật tiến độ
      crawledSet.add(songUrl);
      progress.crawledUrls = Array.from(crawledSet);
      progress.totalSuccess++;
      saveProgress(progress);

      console.log(
        `   ✅ [THÀNH CÔNG] "${song.title}" - Ca sĩ: ${song.artist} - Điệu: ${song.rhythm} - Hợp âm: [${song.chords.slice(0, 6).join(', ')}${song.chords.length > 6 ? '...' : ''}]`
      );
      successCount++;

      // Nghỉ giữa các request để thân thiện với máy chủ
      await sleep(800 + Math.floor(Math.random() * 400));
    } catch (err: any) {
      console.error(`   ❌ Lỗi cào URL ${songUrl}:`, err.message);
      failCount++;
      await sleep(1500);
    }
  }

  console.log(`\n========================================`);
  console.log(`🎉 HOÀN THÀNH ĐỢT CÀO!`);
  console.log(`   - Thành công: ${successCount} bài`);
  console.log(`   - Thất bại: ${failCount} bài`);
  console.log(`   - Tổng số bài đã cào trong hệ thống: ${progress.totalSuccess} bài`);
  console.log(`   - Vị trí lưu trữ: data/songs/*.cho và Supabase Database`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error('Fatal crawler error:', err);
  process.exit(1);
});

