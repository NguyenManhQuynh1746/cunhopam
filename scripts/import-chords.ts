import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Đọc file .env.local thủ công để đảm bảo script luôn có biến môi trường
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

async function importChords() {
  console.log('🎸 Đang khởi động import dữ liệu hợp âm guitar từ @tombatossals/chords-db...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project')) {
    console.error('❌ Lỗi: Cần cấu hình NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong file .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Tải dữ liệu guitar từ chords-db
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const chordsDb = require('@tombatossals/chords-db/lib/guitar.json');
  const chordKeys = Object.keys(chordsDb.chords);
  console.log(`📖 Tìm thấy ${chordKeys.length} họ nốt hợp âm trong chords-db.`);

  const recordsToUpsert: Array<{
    instrument: string;
    root: string;
    suffix: string;
    positions: unknown;
  }> = [];

  for (const rootKey of chordKeys) {
    const chordList = chordsDb.chords[rootKey];
    for (const item of chordList) {
      recordsToUpsert.push({
        instrument: 'guitar',
        root: item.key,
        suffix: item.suffix,
        positions: item.positions,
      });
    }
  }

  console.log(`📦 Tổng số hợp âm cần upsert: ${recordsToUpsert.length}`);

  // Thực hiện upsert theo từng lô (batch size 100) để tối ưu hiệu năng
  const batchSize = 100;
  let successCount = 0;

  for (let i = 0; i < recordsToUpsert.length; i += batchSize) {
    const batch = recordsToUpsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('chords')
      .upsert(batch, { onConflict: 'instrument,root,suffix' });

    if (error) {
      console.error(`❌ Lỗi tại batch ${i} - ${i + batch.length}:`, error.message);
    } else {
      successCount += batch.length;
      process.stdout.write(`\r⏳ Tiến độ: ${successCount}/${recordsToUpsert.length} hợp âm...`);
    }
  }

  console.log(`\n✅ Hoàn tất import ${successCount} hợp âm guitar vào Supabase thành công!`);
}

importChords().catch(err => {
  console.error('❌ Có lỗi xảy ra trong quá trình import:', err);
  process.exit(1);
});

