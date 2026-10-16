/**
 * Chuẩn hoá tên hợp âm ở một nơi duy nhất (Single Source of Truth)
 * Quy ước:
 * - Luôn chuyển nốt gốc về dạng DẤU THĂNG (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
 * - Cắt bỏ phần nốt bass (Slash Chord: C/G -> C, D/F# -> D, Bbm7/Ab -> A#m7)
 * - Chuẩn hoá tên gọi tiếng Việt nếu có (Đô -> C, Rê -> D...)
 * - Giữ nguyên các hậu tố loại hợp âm (m, 7, maj7, m7, sus4, dim, aug, add9...)
 */

const NOTE_TO_SHARP_MAP: Record<string, string> = {
  // Nốt tự nhiên & dấu thăng chuẩn
  C: 'C',
  'C#': 'C#',
  D: 'D',
  'D#': 'D#',
  E: 'E',
  F: 'F',
  'F#': 'F#',
  G: 'G',
  'G#': 'G#',
  A: 'A',
  'A#': 'A#',
  B: 'B',

  // Nốt giáng (Flats -> Sharps)
  DB: 'C#',
  EB: 'D#',
  GB: 'F#',
  AB: 'G#',
  BB: 'A#',

  // Trường hợp nốt trùng cao độ hiếm gặp
  CB: 'B',
  'B#': 'C',
  FB: 'E',
  'E#': 'F',

  // Ký hiệu tiếng Việt
  DO: 'C',
  'DO#': 'C#',
  RE: 'D',
  'RE#': 'D#',
  MI: 'E',
  FA: 'F',
  'FA#': 'F#',
  SOL: 'G',
  'SOL#': 'G#',
  LA: 'A',
  'LA#': 'A#',
  SI: 'B',
};

/**
 * Chuẩn hoá tên một hợp âm
 * @example
 * normalizeChordName('Bb') => 'A#'
 * normalizeChordName('A#') => 'A#'
 * normalizeChordName('C/G') => 'C'
 * normalizeChordName('D/F#') => 'D'
 * normalizeChordName('Bbm7') => 'A#m7'
 * normalizeChordName('F#m7/C#') => 'F#m7'
 */
export function normalizeChordName(chordStr: string): string {
  if (!chordStr) return '';

  let trimmed = chordStr.trim();
  if (!trimmed) return '';

  // 1. Cắt bỏ nốt bass nếu có (Slash Chord: C/G -> C, D/F# -> D)
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx !== -1) {
    trimmed = trimmed.slice(0, slashIdx).trim();
  }

  // 2. Tách nốt gốc và hậu tố bằng regex
  // Nốt gốc có thể là: A-G kèm theo # hoặc b, hoặc chữ tiếng Việt Đô, Rê, Mi...
  const match = trimmed.match(
    /^([A-Ga-g][#b]?|Đô#?|Do#?|Rê#?|Re#?|Mi#?|Fa#?|Sol#?|La#?|Si#?)(.*)$/i
  );

  if (!match) return trimmed;

  let rawRoot = match[1].toUpperCase();
  const rawSuffix = match[2];

  // Thay ký tự tiếng Việt có dấu
  rawRoot = rawRoot
    .replace('ĐÔ', 'DO')
    .replace('RÊ', 'RE');

  const sharpRoot = NOTE_TO_SHARP_MAP[rawRoot] || rawRoot;

  // 3. Chuẩn hoá hậu tố
  let suffix = rawSuffix;
  if (suffix) {
    // Chuẩn hoá các bí danh phổ biến
    if (suffix === 'M' || suffix === 'major') suffix = '';
    else if (suffix === 'min') suffix = 'm';
    else if (suffix === 'M7') suffix = 'maj7';
  }

  return `${sharpRoot}${suffix}`;
}

