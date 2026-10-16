import { EN_SHARPS, EN_FLATS, VI_SHARPS, VI_FLATS } from './constants';
import { parseChord } from './parser';
import { NoteNotation } from './types';

// Danh sách các tông (Key) chuẩn mực sử dụng dấu Giáng (Flats: b) trong nhạc lý
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm']);

/**
 * Kiểm tra xem một tông nhạc (Key) có sử dụng hệ dấu giáng (b) hay không
 */
export function isFlatKeyContext(keyNameOrRootIndex: string | number): boolean {
  if (typeof keyNameOrRootIndex === 'string') {
    const cleanKey = keyNameOrRootIndex.trim();
    if (FLAT_KEYS.has(cleanKey)) return true;
    if (cleanKey.includes('b')) return true;
    // F major (F) và D minor (Dm) đều dùng Bb
    if (cleanKey.toUpperCase() === 'F' || cleanKey.toUpperCase() === 'DM') return true;
  } else if (typeof keyNameOrRootIndex === 'number') {
    const idx = ((keyNameOrRootIndex % 12) + 12) % 12;
    // 5 = F, 10 = Bb, 3 = Eb, 8 = Ab, 1 = Db
    return [5, 10, 3, 8, 1].includes(idx);
  }
  return false;
}

/**
 * Định dạng nốt nhạc theo chỉ số (0-11), hệ ký hiệu và ưu tiên giáng/thăng
 */
export function formatNote(index: number, notation: NoteNotation = 'en', preferFlats = false): string {
  const normIndex = ((index % 12) + 12) % 12;
  if (notation === 'vi') {
    return preferFlats ? VI_FLATS[normIndex] : VI_SHARPS[normIndex];
  }
  return preferFlats ? EN_FLATS[normIndex] : EN_SHARPS[normIndex];
}

/**
 * Đổi tông một hợp âm đơn lẻ
 * @param chordStr Hợp âm đầu vào (vd: "Am", "C/G", "D/F#")
 * @param semitones Số bán âm tăng/giảm (+1, -1, +2, -2...)
 * @param notation Hệ hiển thị ('en' | 'vi')
 * @param keyContext Tông bài hát hoặc cờ ưu tiên dấu giáng (vd: 'F', 'Bb', true)
 */
export function transposeChord(
  chordStr: string,
  semitones: number,
  notation?: NoteNotation,
  keyContext?: string | boolean
): string {
  const parsed = parseChord(chordStr);
  if (!parsed) return chordStr;

  const targetNotation: NoteNotation = notation || (parsed.isVietnameseInput ? 'vi' : 'en');
  const newRootIndex = ((parsed.rootIndex + semitones) % 12 + 12) % 12;

  // Xác định xem có nên ưu tiên viết nốt giáng (b) không
  let preferFlats = false;
  if (typeof keyContext === 'boolean') {
    preferFlats = keyContext;
  } else if (typeof keyContext === 'string') {
    preferFlats = isFlatKeyContext(keyContext);
  } else {
    // Mặc định: Nếu là nốt Bb (index 10), guitarists luôn chuộng Bb hơn A#
    // Nếu nốt gốc mới là 10 (Bb) hoặc chuyển sang vùng F, Bb
    preferFlats = newRootIndex === 10;
  }

  // Đặc biệt: Ở tông F, nốt bậc 4 bắt buộc là Bb (chứ không bao giờ là A#)
  if (keyContext === 'F' && newRootIndex === 10) {
    preferFlats = true;
  }

  const newRoot = formatNote(newRootIndex, targetNotation, preferFlats);
  let result = newRoot + parsed.qualitySuffix;

  // Xử lý nốt bass nếu là Slash Chord (C/G, D/F#, G/B...)
  if (parsed.bassIndex !== undefined) {
    const newBassIndex = ((parsed.bassIndex + semitones) % 12 + 12) % 12;
    const newBass = formatNote(newBassIndex, targetNotation, preferFlats);
    result += '/' + newBass;
  }

  return result;
}

/**
 * Đổi tông toàn bộ hợp âm trong lời bài hát có định dạng thẻ vuông [C] [Am]...
 */
export function transposeLyrics(
  lyricsText: string,
  semitones: number,
  notation?: NoteNotation,
  originalKey = 'C'
): string {
  if (!lyricsText) return '';

  // Tính toán tông đích từ tông gốc + semitones
  let targetKeyContext = 'C';
  const parsedOrig = parseChord(originalKey);
  if (parsedOrig) {
    const newKeyIndex = ((parsedOrig.rootIndex + semitones) % 12 + 12) % 12;
    targetKeyContext = isFlatKeyContext(newKeyIndex)
      ? EN_FLATS[newKeyIndex]
      : EN_SHARPS[newKeyIndex];
  }

  return lyricsText.replace(/\[([^\]]+)\]/g, (_match, chord) => {
    return `[${transposeChord(chord, semitones, notation, targetKeyContext)}]`;
  });
}
