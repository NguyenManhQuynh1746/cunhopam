/**
 * Module phân tích và định dạng dòng ChordPro để hiển thị hợp âm nằm ngay trên lời bài hát
 */

export interface ChordSegment {
  chord?: string; // Tên hợp âm (nếu có)
  text: string;   // Lời bài hát tương ứng ngay dưới hợp âm
}

export interface RenderedLine {
  type: 'lyric' | 'comment' | 'empty';
  segments?: ChordSegment[];
  comment?: string;
}

/**
 * Phân tích nội dung văn bản ChordPro (sau khi đã tách directives chính) thành các dòng hiển thị
 */
export function parseChordLyrics(content: string): RenderedLine[] {
  if (!content) return [];

  const rawLines = content.split(/\r?\n/);
  const result: RenderedLine[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();

    // Dòng trống
    if (!trimmed) {
      result.push({ type: 'empty' });
      continue;
    }

    // Dòng chú thích hoặc tiêu đề đoạn: {comment: ...} hoặc {c: ...} hoặc # ...
    const commentMatch = trimmed.match(/^\{\s*(?:comment|c)\s*:\s*(.*?)\s*\}$/i);
    if (commentMatch) {
      result.push({
        type: 'comment',
        comment: commentMatch[1],
      });
      continue;
    }

    if (trimmed.startsWith('#')) {
      result.push({
        type: 'comment',
        comment: trimmed.replace(/^#+\s*/, ''),
      });
      continue;
    }

    // Dòng lời và hợp âm
    // Phân tích các cặp [Chord]Lời
    const segments: ChordSegment[] = [];

    // Nếu không có dấu ngoặc vuông nào thì toàn bộ là lời
    if (!line.includes('[')) {
      result.push({
        type: 'lyric',
        segments: [{ text: line }],
      });
      continue;
    }

    const parts = line.split('[');
    // Phần lời đầu tiên trước dấu '[' đầu tiên (nếu có)
    if (parts[0]) {
      segments.push({ text: parts[0] });
    }

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const closeIdx = part.indexOf(']');
      if (closeIdx === -1) {
        // Trường hợp lỗi cú pháp không đóng ']'
        segments.push({ text: '[' + part });
      } else {
        const chord = part.slice(0, closeIdx).trim();
        const text = part.slice(closeIdx + 1);
        segments.push({
          chord: chord || undefined,
          text: text, // Giữ nguyên khoảng trắng giữa các từ
        });
      }
    }

    result.push({
      type: 'lyric',
      segments,
    });
  }

  return result;
}

