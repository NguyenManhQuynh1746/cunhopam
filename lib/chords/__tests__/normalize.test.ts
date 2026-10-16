import { describe, it, expect } from 'vitest';
import { normalizeChordName } from '../normalize';

describe('normalizeChordName', () => {
  it('đưa nốt giáng (b) về dấu thăng (#) đồng âm', () => {
    expect(normalizeChordName('Bb')).toBe('A#');
    expect(normalizeChordName('Eb')).toBe('D#');
    expect(normalizeChordName('Db')).toBe('C#');
    expect(normalizeChordName('Ab')).toBe('G#');
    expect(normalizeChordName('Gb')).toBe('F#');
  });

  it('giữ nguyên các nốt tự nhiên và dấu thăng', () => {
    expect(normalizeChordName('C')).toBe('C');
    expect(normalizeChordName('F#')).toBe('F#');
    expect(normalizeChordName('A#')).toBe('A#');
  });

  it('bỏ phần nốt bass của Slash Chord (C/G -> C, D/F# -> D)', () => {
    expect(normalizeChordName('C/G')).toBe('C');
    expect(normalizeChordName('D/F#')).toBe('D');
    expect(normalizeChordName('G/B')).toBe('G');
    expect(normalizeChordName('A/C#')).toBe('A');
    expect(normalizeChordName('Bbm7/Ab')).toBe('A#m7');
  });

  it('bảo toàn các hậu tố loại hợp âm phức tạp (m, 7, maj7, m7, sus4, dim, add9)', () => {
    expect(normalizeChordName('Dm7')).toBe('Dm7');
    expect(normalizeChordName('Bbm7')).toBe('A#m7');
    expect(normalizeChordName('Cmaj7')).toBe('Cmaj7');
    expect(normalizeChordName('Dsus4')).toBe('Dsus4');
    expect(normalizeChordName('F#m7')).toBe('F#m7');
    expect(normalizeChordName('Ebdim')).toBe('D#dim');
    expect(normalizeChordName('Cadd9')).toBe('Cadd9');
  });

  it('hỗ trợ tên gọi tiếng Việt (Đô -> C, Rê -> D...)', () => {
    expect(normalizeChordName('Đô')).toBe('C');
    expect(normalizeChordName('Lam')).toBe('Am');
    expect(normalizeChordName('Sol7')).toBe('G7');
  });
});

