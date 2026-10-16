import { parseChord } from '@/lib/chords/parser';

export interface ChordError {
  line: number;
  chord: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ChordError[];
  chords: string[];
}

/**
 * Kiểm tra tính hợp lệ của văn bản ChordPro
 * - Trích xuất tất cả các hợp âm trong ngoặc vuông [Chord]
 * - Kiểm tra cấu trúc hợp âm có hợp lệ theo lý thuyết âm nhạc
 * - Phát hiện nếu có chứa mã HTML nguy hiểm
 */
export function validateChordPro(content: string): ValidationResult {
  const errors: ChordError[] = [];
  const chordsSet = new Set<string>();

  if (!content || typeof content !== 'string') {
    return { isValid: false, errors: [{ line: 1, chord: '', message: 'Nội dung bài hát không được để trống.' }], chords: [] };
  }

  // 1. Kiểm tra HTML injection (chỉ chấp nhận văn bản thuần)
  if (/<(script|iframe|object|embed|style|svg|form|input|button)[\s>]/i.test(content)) {
    errors.push({
      line: 1,
      chord: '',
      message: 'Nội dung chứa thẻ mã lệnh không an toàn. Vui lòng chỉ dùng văn bản thuần và cú pháp ChordPro [Hợp âm].',
    });
  }

  const lines = content.split(/\r?\n/);
  const CHORD_TAG_REGEX = /\[([^\]]+)\]/g;

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    // Bỏ qua các dòng chỉ thị ChordPro dạng {title:...}, {artist:...}, {comment:...}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return;
    }

    let match: RegExpExecArray | null;
    while ((match = CHORD_TAG_REGEX.exec(lineText)) !== null) {
      const rawChord = match[1].trim();

      // Bỏ qua comment dạng [Intro], [Chorus], [Verse] v.v.
      if (/^(intro|outro|chorus|verse|bridge|pre-chorus|solo|interlude|đoạn|phiên khúc|điệp khúc|dạo đầu|kết|giang tấu)/i.test(rawChord)) {
        continue;
      }

      // Kiểm tra xem rawChord có phân tích được thành hợp âm hợp lệ không
      const parsed = parseChord(rawChord);
      if (!parsed) {
        errors.push({
          line: lineNum,
          chord: rawChord,
          message: `Hợp âm "[${rawChord}]" ở dòng ${lineNum} không đúng định dạng nhạc lý.`,
        });
      } else {
        chordsSet.add(rawChord);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    chords: Array.from(chordsSet),
  };
}

