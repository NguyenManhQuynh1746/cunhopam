/**
 * Tính toán danh sách các nốt cấu thành hợp âm
 * Đảm bảo ghi đúng ký hiệu chuẩn nhạc lý theo nốt gốc (Flats/Sharps chính xác)
 * Ví dụ: Bbm7 = ['Bb', 'Db', 'F', 'Ab'] (không bao giờ viết thành A#, C#, F, G#)
 *         F#m = ['F#', 'A', 'C#']
 */

const LETTER_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Định nghĩa các quãng (interval tính theo bán âm và bước chữ cái) cho các loại hợp âm
interface ChordInterval {
  semitones: number;
  letterStep: number; // 0=Root, 1=Second/9th, 2=Third, 3=Fourth, 4=Fifth, 5=Sixth, 6=Seventh
}

const CHORD_FORMULAS: Record<string, ChordInterval[]> = {
  major: [
    { semitones: 0, letterStep: 0 },
    { semitones: 4, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
  ],
  minor: [
    { semitones: 0, letterStep: 0 },
    { semitones: 3, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
  ],
  '7': [
    { semitones: 0, letterStep: 0 },
    { semitones: 4, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
    { semitones: 10, letterStep: 6 },
  ],
  m7: [
    { semitones: 0, letterStep: 0 },
    { semitones: 3, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
    { semitones: 10, letterStep: 6 },
  ],
  maj7: [
    { semitones: 0, letterStep: 0 },
    { semitones: 4, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
    { semitones: 11, letterStep: 6 },
  ],
  sus4: [
    { semitones: 0, letterStep: 0 },
    { semitones: 5, letterStep: 3 },
    { semitones: 7, letterStep: 4 },
  ],
  sus2: [
    { semitones: 0, letterStep: 0 },
    { semitones: 2, letterStep: 1 },
    { semitones: 7, letterStep: 4 },
  ],
  dim: [
    { semitones: 0, letterStep: 0 },
    { semitones: 3, letterStep: 2 },
    { semitones: 6, letterStep: 4 },
  ],
  dim7: [
    { semitones: 0, letterStep: 0 },
    { semitones: 3, letterStep: 2 },
    { semitones: 6, letterStep: 4 },
    { semitones: 9, letterStep: 6 },
  ],
  aug: [
    { semitones: 0, letterStep: 0 },
    { semitones: 4, letterStep: 2 },
    { semitones: 8, letterStep: 4 },
  ],
  '6': [
    { semitones: 0, letterStep: 0 },
    { semitones: 4, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
    { semitones: 9, letterStep: 5 },
  ],
  m6: [
    { semitones: 0, letterStep: 0 },
    { semitones: 3, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
    { semitones: 9, letterStep: 5 },
  ],
  add9: [
    { semitones: 0, letterStep: 0 },
    { semitones: 4, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
    { semitones: 2, letterStep: 1 },
  ],
  '9': [
    { semitones: 0, letterStep: 0 },
    { semitones: 4, letterStep: 2 },
    { semitones: 7, letterStep: 4 },
    { semitones: 10, letterStep: 6 },
    { semitones: 2, letterStep: 1 },
  ],
};

function normalizeQuality(qual: string): string {
  const q = qual.toLowerCase().trim();
  if (!q || q === 'm' || q === 'major') return q === 'm' ? 'minor' : 'major';
  if (q === 'min') return 'minor';
  if (q === 'm7' || q === 'min7') return 'm7';
  if (q === '7' || q === 'dom7') return '7';
  if (q === 'maj7' || q === 'm7+') return 'maj7';
  if (CHORD_FORMULAS[q]) return q;
  return 'major';
}

/**
 * Lấy danh sách các nốt cấu thành của hợp âm
 */
export function getChordNotes(chordStr: string): string[] {
  if (!chordStr) return [];

  // Tách bass nếu có (C/G -> C)
  let clean = chordStr.trim();
  const slashIdx = clean.indexOf('/');
  if (slashIdx !== -1) {
    clean = clean.slice(0, slashIdx);
  }

  const match = clean.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return [chordStr];

  const rawRoot = match[1];
  const rootLetter = rawRoot[0].toUpperCase();
  const rootAccidental = rawRoot.slice(1);
  const suffix = match[2];

  const rootLetterIdx = LETTER_NAMES.indexOf(rootLetter);
  if (rootLetterIdx === -1) return [chordStr];

  // Bán âm của nốt gốc
  let rootSemitone = NATURAL_SEMITONES[rootLetter];
  if (rootAccidental === '#') rootSemitone = (rootSemitone + 1) % 12;
  else if (rootAccidental === 'b') rootSemitone = (rootSemitone - 1 + 12) % 12;

  const quality = normalizeQuality(suffix);
  const formula = CHORD_FORMULAS[quality] || CHORD_FORMULAS.major;

  const notes: string[] = [];

  for (const interval of formula) {
    const targetSemitone = (rootSemitone + interval.semitones) % 12;
    const targetLetterIdx = (rootLetterIdx + interval.letterStep) % 7;
    const targetLetter = LETTER_NAMES[targetLetterIdx];
    const naturalTargetSemitone = NATURAL_SEMITONES[targetLetter];

    // Tính độ lệch bán âm so với nốt tự nhiên của chữ cái đó
    let diff = (targetSemitone - naturalTargetSemitone + 12) % 12;
    // Chuyển sang khoảng cách dấu: 0, 1 (#), 2 (##), 11 (b), 10 (bb)
    if (diff > 6) diff -= 12;

    let accidental = '';
    if (diff === 1) accidental = '#';
    else if (diff === 2) accidental = '##';
    else if (diff === -1) accidental = 'b';
    else if (diff === -2) accidental = 'bb';

    notes.push(`${targetLetter}${accidental}`);
  }

  return notes;
}

