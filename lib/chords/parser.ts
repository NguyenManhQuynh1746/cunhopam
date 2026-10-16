import { NOTE_TO_INDEX, SUFFIX_MAP, EN_SHARPS, VI_SHARPS } from './constants';
import { ParsedChord, ChordQualityKey } from './types';

// Biểu thức regex nhận diện nốt gốc tiếng Việt & tiếng Anh
const CHORD_REGEX = /^([A-Ga-g][#b]?|đô[#b]?|do[#b]?|rê[#b]?|re[#b]?|mi[#b]?|fa[#b]?|sol[#b]?|la[#b]?|si[#b]?)(.*?)(?:\/([A-Ga-g][#b]?|đô[#b]?|do[#b]?|rê[#b]?|re[#b]?|mi[#b]?|fa[#b]?|sol[#b]?|la[#b]?|si[#b]?))?$/i;

/**
 * Phân tích chuỗi hợp âm bất kỳ thành cấu trúc ParsedChord
 * Ví dụ: "Am7" -> rootIndex: 9, qualityKey: "m7"
 * "G/B" -> rootIndex: 7, bassIndex: 11
 * "Đôm" -> rootIndex: 0, qualityKey: "minor"
 */
export function parseChord(input: string): ParsedChord | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  const match = trimmed.match(CHORD_REGEX);
  if (!match) return null;

  const rawRoot = match[1];
  const rawSuffix = match[2] || '';
  const rawBass = match[3];

  const rootLower = rawRoot.toLowerCase();
  if (!(rootLower in NOTE_TO_INDEX)) return null;

  const rootIndex = NOTE_TO_INDEX[rootLower];
  const isVietnameseInput = /^(đô|do|rê|re|mi|fa|sol|la|si)/i.test(rawRoot);

  // Chuẩn hoá root text dạng viết hoa chuẩn (C#, F, Bb, hoặc Đô, Rê...)
  const rootText = isVietnameseInput ? VI_SHARPS[rootIndex] : EN_SHARPS[rootIndex];

  // Xác định qualityKey
  const qualityKey: ChordQualityKey = SUFFIX_MAP[rawSuffix] || 'major';
  const qualitySuffix = SUFFIX_MAP[rawSuffix] !== undefined ? rawSuffix : '';

  // Xử lý nốt bass nếu có (Slash chord)
  let bassIndex: number | undefined = undefined;
  let bassText: string | undefined = undefined;

  if (rawBass) {
    const bassLower = rawBass.toLowerCase();
    if (bassLower in NOTE_TO_INDEX) {
      bassIndex = NOTE_TO_INDEX[bassLower];
      const isBassVi = /^(đô|do|rê|re|mi|fa|sol|la|si)/i.test(rawBass);
      bassText = isBassVi ? VI_SHARPS[bassIndex] : EN_SHARPS[bassIndex];
    }
  }

  return {
    raw: trimmed,
    rootIndex,
    rootText,
    qualityKey,
    qualitySuffix,
    bassIndex,
    bassText,
    isVietnameseInput,
  };
}

