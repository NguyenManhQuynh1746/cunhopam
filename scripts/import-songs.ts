import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseChordPro, slugify } from '../lib/chordpro';

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

async function importSongs() {
  const isVerify = process.argv.includes('--verify');
  console.log(`🎵 Bắt đầu import bài hát từ thư mục data/songs/ (Chế độ tự duyệt --verify: ${isVerify ? 'BẬT' : 'TẮT'})...`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project')) {
    console.error('❌ Lỗi: Cần cấu hình NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong file .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const songsDir = path.resolve(process.cwd(), 'data/songs');
  if (!fs.existsSync(songsDir)) {
    console.error(`❌ Không tìm thấy thư mục: ${songsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(songsDir).filter(f => f.endsWith('.cho'));
  console.log(`📁 Tìm thấy ${files.length} file .cho trong thư mục.`);

  let importedCount = 0;
  let rejectedCount = 0;

  for (const file of files) {
    const filePath = path.join(songsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const result = parseChordPro(content);
    if (!result.success || !result.song) {
      console.error(`\n❌ [TỪ CHỐI] File "${file}" không hợp lệ:`);
      result.errors?.forEach(err => console.error(`   - ${err}`));
      rejectedCount++;
      continue;
    }

    const { song } = result;

    // 1. Đảm bảo Nghệ sĩ tồn tại trong bảng artists
    let artistId: string | null = null;
    const artistSlug = slugify(song.artist);
    const { data: artistData } = await supabase
      .from('artists')
      .select('id')
      .eq('slug', artistSlug)
      .maybeSingle();

    if (artistData) {
      artistId = artistData.id;
    } else {
      const { data: newArtist, error: artistErr } = await supabase
        .from('artists')
        .insert({ name: song.artist, slug: artistSlug })
        .select('id')
        .single();
      if (!artistErr && newArtist) artistId = newArtist.id;
    }

    // 2. Đảm bảo Điệu nhạc tồn tại trong bảng rhythms (nếu có)
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
        const { data: newRhythm, error: rhythmErr } = await supabase
          .from('rhythms')
          .insert({ name: song.rhythm, slug: rhythmSlug })
          .select('id')
          .single();
        if (!rhythmErr && newRhythm) rhythmId = newRhythm.id;
      }
    }

    // 3. Kiểm tra bài hát đã tồn tại theo slug chưa để KHÔNG ghi đè is_verified & takedown_status
    const { data: existingSong } = await supabase
      .from('songs')
      .select('id, is_verified, takedown_status')
      .eq('slug', song.slug)
      .maybeSingle();

    let isVerified = false;
    let takedownStatus = 'none';

    if (existingSong) {
      // Giữ nguyên trạng thái duyệt và bản quyền hiện có của bài đã tồn tại
      isVerified = existingSong.is_verified;
      takedownStatus = existingSong.takedown_status;
      console.log(`ℹ️ Bài hát "${song.title}" đã tồn tại. Giữ nguyên trạng thái: is_verified=${isVerified}, takedown=${takedownStatus}`);
    } else {
      // Bài mới: nếu có cờ --verify và license là public_domain thì duyệt ngay, ngược lại false
      isVerified = isVerify && song.license === 'public_domain';
    }

    // 4. Upsert vào bảng songs
    const songRecord = {
      title: song.title,
      slug: song.slug,
      artist_id: artistId,
      rhythm_id: rhythmId,
      key: song.key,
      content: song.content,
      chords: song.chords,
      license_type: song.license,
      rights_holder: song.rightsHolder,
      source_url: song.source,
      license_note: song.licenseNote,
      is_verified: isVerified,
      takedown_status: takedownStatus,
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedSong, error: songErr } = await supabase
      .from('songs')
      .upsert(songRecord, { onConflict: 'slug' })
      .select('id')
      .single();

    if (songErr) {
      console.error(`❌ Lỗi lưu bài hát "${song.title}":`, songErr.message);
      rejectedCount++;
      continue;
    }

    // 5. Liên kết song_artists
    if (artistId && upsertedSong) {
      await supabase
        .from('song_artists')
        .upsert({ song_id: upsertedSong.id, artist_id: artistId, role: 'performer' });
    }

    console.log(
      `✅ [THÀNH CÔNG] "${song.title}" (${song.artist}) - Hợp âm: [${song.chords.join(', ')}] - Bản quyền: ${song.license} - Đã duyệt: ${isVerified ? 'CÓ' : 'CHỜ DUYỆT'}`
    );
    importedCount++;
  }

  console.log(`\n🎉 Hoàn thành! Đã nhập: ${importedCount} bài | Từ chối: ${rejectedCount} bài.`);
}

importSongs().catch(err => {
  console.error('❌ Lỗi import bài hát:', err);
  process.exit(1);
});

