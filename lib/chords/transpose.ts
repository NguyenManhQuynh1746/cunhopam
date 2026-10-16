import { EN_SHARPS, EN_FLATS, VI_SHARPS, VI_FLATS } from './constants';
import { parseChord } from './parser';
import { NoteNotation } from './types';

/**
 * Định dạng nốt nhạc theo chỉ số (0-11) và hệ ký hiệu
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
 * @param chordStr Hợp âm đầu vào (vd: "Am", "G/B", "C#m7")
 * @param semitones Số bán âm tăng/giảm (+1, -1, +2, -2...)
 * @param notation Hệ hiển thị ('en' | 'vi'), nếu không truyền sẽ giữ nguyên hệ của input hoặc mặc định 'en'
 */
export function transposeChord(chordStr: string, semitones: number, notation?: NoteNotation): string {
  const parsed = parseChord(chordStr);
  if (!parsed) return chordStr; // Giữ nguyên nếu không parse được

  const targetNotation: NoteNotation = notation || (parsed.isVietnameseInput ? 'vi' : 'en');
  const newRootIndex = ((parsed.rootIndex + semitones) % 12 + 12) % 12;
  const newRoot = formatNote(newRootIndex, targetNotation);

  let result = newRoot + parsed.qualitySuffix;

  // Xử lý nốt bass nếu là slash chord
  if (parsed.bassIndex !== undefined) {
    const newBassIndex = ((parsed.bassIndex + semitones) % 12 + 12) % 12;
    const newBass = formatNote(newBassIndex, targetNotation);
    result += '/' + newBass;
  }

  return result;
}

/**
 * Đổi tông toàn bộ hợp âm trong lời bài hát có định dạng thẻ vuông [C] [Am]...
 */
export function transposeLyrics(lyricsText: string, semitones: number, notation?: NoteNotation): string {
  if (!lyricsText) return '';
  return lyricsText.replace(/\[([^\]]+)\]/g, (match, chord) => {
    return `[${transposeChord(chord, semitones, notation)}]`;
  });
}

