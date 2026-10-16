import { describe, it, expect } from 'vitest';
import { parseChordLyrics } from '../renderer';

describe('parseChordLyrics', () => {
  it('phân tích chính xác dòng có hợp âm nằm trước chữ', () => {
    const input = '[C]Chiều rơi trên phố nhỏ, mưa [G]bay qua ngõ vắng';
    const lines = parseChordLyrics(input);

    expect(lines).toHaveLength(1);
    expect(lines[0].type).toBe('lyric');
    expect(lines[0].segments).toEqual([
      { chord: 'C', text: 'Chiều rơi trên phố nhỏ, mưa ' },
      { chord: 'G', text: 'bay qua ngõ vắng' },
    ]);
  });

  it('xử lý lời trước hợp âm đầu tiên', () => {
    const input = 'Đoạn đầu [Am]lời sau';
    const lines = parseChordLyrics(input);

    expect(lines).toHaveLength(1);
    expect(lines[0].type).toBe('lyric');
    expect(lines[0].segments).toEqual([
      { text: 'Đoạn đầu ' },
      { chord: 'Am', text: 'lời sau' },
    ]);
  });

  it('nhận diện các dòng chú thích hoặc tiêu đề đoạn {c: ...} và # ...', () => {
    const input = '{c: Điệp khúc}\n# Đoạn 2\n[C]Lời hát';
    const lines = parseChordLyrics(input);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toEqual({ type: 'comment', comment: 'Điệp khúc' });
    expect(lines[1]).toEqual({ type: 'comment', comment: 'Đoạn 2' });
    expect(lines[2].type).toBe('lyric');
  });

  it('xử lý các dòng trống', () => {
    const input = '[C]Dòng 1\n\n[G]Dòng 2';
    const lines = parseChordLyrics(input);

    expect(lines).toHaveLength(3);
    expect(lines[0].type).toBe('lyric');
    expect(lines[1].type).toBe('empty');
    expect(lines[2].type).toBe('lyric');
  });
});

