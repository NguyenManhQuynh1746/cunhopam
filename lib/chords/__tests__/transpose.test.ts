import { describe, it, expect } from 'vitest';
import { transposeChord, transposeLyrics, formatNote } from '../transpose';

describe('formatNote', () => {
  it('định dạng đúng theo hệ Anh và Việt', () => {
    expect(formatNote(0, 'en')).toBe('C');
    expect(formatNote(0, 'vi')).toBe('Đô');
    expect(formatNote(9, 'en')).toBe('A');
    expect(formatNote(9, 'vi')).toBe('La');
    expect(formatNote(1, 'en', true)).toBe('Db');
    expect(formatNote(1, 'en', false)).toBe('C#');
  });
});

describe('transposeChord', () => {
  it('tăng bán âm (+1, +2) chuẩn xác', () => {
    expect(transposeChord('C', 1)).toBe('C#');
    expect(transposeChord('C', 2)).toBe('D');
    expect(transposeChord('Am', 2)).toBe('Bm');
    expect(transposeChord('E', 1)).toBe('F');
    expect(transposeChord('B', 1)).toBe('C');
  });

  it('giảm bán âm (-1, -2) chuẩn xác', () => {
    expect(transposeChord('C', -1)).toBe('B');
    expect(transposeChord('Am', -2)).toBe('Gm');
    expect(transposeChord('D', -2)).toBe('C');
  });

  it('xoay vòng 12 bán âm (+12, -12)', () => {
    expect(transposeChord('G7', 12)).toBe('G7');
    expect(transposeChord('F#m7', -12)).toBe('F#m7');
  });

  it('dịch tông slash chords (G/B, C/E, C/G, D/F#)', () => {
    expect(transposeChord('G/B', 2)).toBe('A/C#');
    expect(transposeChord('C/E', 1)).toBe('C#/F');
    expect(transposeChord('C/G', 2)).toBe('D/A');
    expect(transposeChord('D/F#', 2)).toBe('E/G#');
    expect(transposeChord('D/F#', -2)).toBe('C/E');
  });

  it('chọn đúng cách ghi nốt giáng (Bb thay vì A#) trong ngữ cảnh tông F hoặc flat keys', () => {
    // Trong tông F, nốt bậc 4 hoặc nốt A tăng 1 bán âm phải là Bb
    expect(transposeChord('A', 1, 'en', 'F')).toBe('Bb');
    expect(transposeChord('Am', 1, 'en', 'F')).toBe('Bbm');
    // Khi dịch bài từ C sang F (+5 bán âm): hợp âm F trong C sẽ trở thành Bb trong F
    const lyricsInC = '[C]Hát mừng [F]ngày vui';
    const lyricsInF = transposeLyrics(lyricsInC, 5, 'en', 'C');
    expect(lyricsInF).toContain('[Bb]');
    expect(lyricsInF).not.toContain('[A#]');
  });

  it('hỗ trợ chuyển đổi sang hệ tiếng Việt (Đô Rê Mi)', () => {
    expect(transposeChord('C', 0, 'vi')).toBe('Đô');
    expect(transposeChord('Am', 0, 'vi')).toBe('Lam');
    expect(transposeChord('C', 2, 'vi')).toBe('Rê');
  });
});

describe('transposeLyrics', () => {
  it('dịch tông các hợp âm được đặt trong dấu ngoặc vuông []', () => {
    const input = '[C]Chiều rơi trên phố nhỏ, mưa [G]bay qua ngõ vắng\n[Am]Anh đi tìm bóng em, [F]giữa ngàn hàng cây lặng';
    const output = transposeLyrics(input, 2);
    expect(output).toBe('[D]Chiều rơi trên phố nhỏ, mưa [A]bay qua ngõ vắng\n[Bm]Anh đi tìm bóng em, [G]giữa ngàn hàng cây lặng');
  });

  it('chuyển toàn bộ hợp âm trong lời sang tiếng Việt khi yêu cầu', () => {
    const input = '[C]Hát câu [G]yêu thương [Am]này';
    const output = transposeLyrics(input, 0, 'vi');
    expect(output).toBe('[Đô]Hát câu [Sol]yêu thương [Lam]này');
  });
});

