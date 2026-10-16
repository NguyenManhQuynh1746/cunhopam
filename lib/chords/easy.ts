import { transposeChord } from './transpose';

/**
 * Danh sách các hợp âm mở (Open Chords) cơ bản, dễ bấm nhất cho người mới bắt đầu
 */
export const OPEN_EASY_CHORDS = new Set([
  'C', 'G', 'D', 'A', 'E',
  'Am', 'Em', 'Dm',
  'C7', 'G7', 'D7', 'A7', 'E7',
  'Fmaj7', 'Bm7', 'Cadd9', 'Dsus4', 'Asus4', 'Esus4'
]);

/**
 * Bảng thay thế các hợp âm chặn (Barre) khó thành hợp âm dễ tương đương
 */
export const BARRE_TO_EASY_MAP: Record<string, string> = {
  F: 'Fmaj7',
  Bm: 'Bm7',
  Bb: 'A#',
  B: 'B7',
  'F#m': 'Em', // Khi kẹp capo hoặc thế bấm thay thế
  'C#m': 'Am',
  'G#m': 'Em',
};

export interface CapoSuggestion {
  capoFret: number;
  originalKey: string;
  suggestedKey: string;
  originalChords: string[];
  transposedChords: string[];
  easyScore: number; // Tỉ lệ hợp âm mở (0 - 100%)
}

/**
 * Gợi ý vị trí kẹp Capo (từ 0 đến 5) để có các thế bấm hợp âm mở dễ chơi nhất
 * @param chords Danh sách hợp âm hiện tại
 * @param currentKey Tông bài hát hiện tại
 */
export function suggestCapo(chords: string[], currentKey = 'C'): CapoSuggestion | null {
  if (!chords || chords.length === 0) return null;

  const uniqueChords = Array.from(new Set(chords));

  // Kiểm tra nếu tất cả hợp âm đã là hợp âm mở thì không bắt buộc cần Capo
  const alreadyAllOpen = uniqueChords.every((c) => OPEN_EASY_CHORDS.has(c));
  if (alreadyAllOpen) {
    return {
      capoFret: 0,
      originalKey: currentKey,
      suggestedKey: currentKey,
      originalChords: uniqueChords,
      transposedChords: uniqueChords,
      easyScore: 100,
    };
  }

  let bestSuggestion: CapoSuggestion | null = null;
  let highestScore = -1;

  // Thử các vị trí Capo từ 1 đến 5 (Capo N nghĩa là thế bấm hạ N cung)
  for (let capo = 1; capo <= 5; capo++) {
    // Thế bấm khi kẹp capo N = hợp âm hạ N bán âm (-capo)
    const transposedKey = transposeChord(currentKey, -capo);
    const transposedChords = uniqueChords.map((c) => transposeChord(c, -capo));

    // Đếm số lượng hợp âm mở dễ bấm
    const openCount = transposedChords.filter((c) => OPEN_EASY_CHORDS.has(c)).length;
    const score = (openCount / transposedChords.length) * 100;

    // Ưu tiên điểm cao nhất; nếu bằng điểm thì ưu tiên Capo thấp hơn (dưới ngăn 4)
    if (score > highestScore) {
      highestScore = score;
      bestSuggestion = {
        capoFret: capo,
        originalKey: currentKey,
        suggestedKey: transposedKey,
        originalChords: uniqueChords,
        transposedChords,
        easyScore: score,
      };
    }
  }

  return bestSuggestion;
}

/**
 * Chuyển đổi một hợp âm sang dạng dễ nếu là hợp âm chặn khó
 */
export function getEasyChordAlternative(chord: string): string {
  return BARRE_TO_EASY_MAP[chord] || chord;
}

