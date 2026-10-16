import { describe, it, expect } from 'vitest';
import { suggestCapo } from '../easy';

describe('suggestCapo', () => {
  it('tông Bb (Bb, F, Gm, Eb) -> gợi ý kẹp Capo 3 bấm thế G, D, Em, C', () => {
    const chordsInBb = ['Bb', 'F', 'Gm', 'Eb'];
    const suggestion = suggestCapo(chordsInBb, 'Bb');

    expect(suggestion).not.toBeNull();
    expect(suggestion?.capoFret).toBe(3);
    expect(suggestion?.suggestedKey).toBe('G');
    expect(suggestion?.transposedChords).toEqual(['G', 'D', 'Em', 'C']);
  });

  it('tông A (A, D, E, F#m) -> gợi ý kẹp Capo 2 bấm thế G, C, D, Em', () => {
    const chordsInA = ['A', 'D', 'E', 'F#m'];
    const suggestion = suggestCapo(chordsInA, 'A');

    expect(suggestion).not.toBeNull();
    expect(suggestion?.capoFret).toBe(2);
    expect(suggestion?.suggestedKey).toBe('G');
    expect(suggestion?.transposedChords).toEqual(['G', 'C', 'D', 'Em']);
  });

  it('bài hát đã gồm toàn hợp âm mở (C, Am, Fmaj7, G) -> capo 0 không cần kẹp', () => {
    const openChords = ['C', 'Am', 'Fmaj7', 'G'];
    const suggestion = suggestCapo(openChords, 'C');

    expect(suggestion).not.toBeNull();
    expect(suggestion?.capoFret).toBe(0);
    expect(suggestion?.transposedChords).toEqual(openChords);
  });

  it('giới hạn vị trí capo tối đa trong khoảng 0-5', () => {
    const chords = ['F#', 'B', 'C#'];
    const suggestion = suggestCapo(chords, 'F#');

    if (suggestion) {
      expect(suggestion.capoFret).toBeGreaterThanOrEqual(0);
      expect(suggestion.capoFret).toBeLessThanOrEqual(5);
    }
  });
});

