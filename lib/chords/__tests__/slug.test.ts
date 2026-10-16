import { describe, it, expect } from 'vitest';
import { chordToSlug, slugToChord } from '../slug';

describe('chordToSlug & slugToChord (Hai chiều)', () => {
  it('chuyển đổi chuẩn xác các hợp âm có dấu thăng (# -> -thang)', () => {
    expect(chordToSlug('C#')).toBe('c-thang');
    expect(slugToChord('c-thang')).toBe('C#');

    expect(chordToSlug('F#m7')).toBe('f-thang-m7');
    expect(slugToChord('f-thang-m7')).toBe('F#m7');

    expect(chordToSlug('G#dim')).toBe('g-thang-dim');
    expect(slugToChord('g-thang-dim')).toBe('G#dim');
  });

  it('chuyển đổi chuẩn xác các hợp âm có dấu giáng (b -> -giang)', () => {
    expect(chordToSlug('Bb')).toBe('b-giang');
    expect(slugToChord('b-giang')).toBe('Bb');

    expect(chordToSlug('Bbm7')).toBe('b-giang-m7');
    expect(slugToChord('b-giang-m7')).toBe('Bbm7');

    expect(chordToSlug('Ebmaj7')).toBe('e-giang-maj7');
    expect(slugToChord('e-giang-maj7')).toBe('Ebmaj7');
  });

  it('chuyển đổi chuẩn xác các hợp âm tự nhiên', () => {
    expect(chordToSlug('C')).toBe('c');
    expect(slugToChord('c')).toBe('C');

    expect(chordToSlug('Am')).toBe('am');
    expect(slugToChord('am')).toBe('Am');

    expect(chordToSlug('G7')).toBe('g7');
    expect(slugToChord('g7')).toBe('G7');

    expect(chordToSlug('Dsus4')).toBe('dsus4');
    expect(slugToChord('dsus4')).toBe('Dsus4');
    expect(slugToChord('d-sus4')).toBe('Dsus4');
  });

  it('bảo toàn tính hai chiều (slugToChord(chordToSlug(c)) === c)', () => {
    const testChords = [
      'C', 'Am', 'F', 'G7', 'C#', 'Bb', 'Bbm7', 'F#m7', 'Eb', 'Abmaj7', 'Ddim', 'Esus4'
    ];

    for (const chord of testChords) {
      const slug = chordToSlug(chord);
      const restored = slugToChord(slug);
      expect(restored).toBe(chord);
    }
  });

  it('trả về null nếu slug không hợp lệ', () => {
    expect(slugToChord('')).toBeNull();
    expect(slugToChord('invalid-chord-slug-xyz')).toBeNull();
  });
});
