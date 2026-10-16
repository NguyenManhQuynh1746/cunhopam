import { describe, it, expect } from 'vitest';
import { getChordNotes } from '../notes';

describe('getChordNotes', () => {
  it('ghi đúng nốt cấu thành theo cách viết của hợp âm giáng (Bbm7 = Bb, Db, F, Ab)', () => {
    const notes = getChordNotes('Bbm7');
    expect(notes).toEqual(['Bb', 'Db', 'F', 'Ab']);
  });

  it('ghi đúng nốt cấu thành cho các hợp âm giáng khác (Eb, Ab, Dbmaj7)', () => {
    expect(getChordNotes('Eb')).toEqual(['Eb', 'G', 'Bb']);
    expect(getChordNotes('Ab')).toEqual(['Ab', 'C', 'Eb']);
    expect(getChordNotes('Dbmaj7')).toEqual(['Db', 'F', 'Ab', 'C']);
  });

  it('ghi đúng nốt cấu thành theo cách viết của hợp âm thăng (F#m = F#, A, C#)', () => {
    const notes = getChordNotes('F#m');
    expect(notes).toEqual(['F#', 'A', 'C#']);
  });

  it('ghi đúng nốt cấu thành cho các hợp âm thăng khác (C#m, G#7)', () => {
    expect(getChordNotes('C#m')).toEqual(['C#', 'E', 'G#']);
    expect(getChordNotes('C#m7')).toEqual(['C#', 'E', 'G#', 'B']);
    expect(getChordNotes('G#m')).toEqual(['G#', 'B', 'D#']);
    expect(getChordNotes('G#7')).toEqual(['G#', 'B#', 'D#', 'F#']);
  });

  it('ghi đúng nốt cấu thành cho các hợp âm tự nhiên phổ biến (C, Am, G7, Dm)', () => {
    expect(getChordNotes('C')).toEqual(['C', 'E', 'G']);
    expect(getChordNotes('Am')).toEqual(['A', 'C', 'E']);
    expect(getChordNotes('G7')).toEqual(['G', 'B', 'D', 'F']);
    expect(getChordNotes('Dm')).toEqual(['D', 'F', 'A']);
  });

  it('tự động bỏ qua nốt bass khi tính nốt cấu thành của Slash Chord (C/G -> C, D/F# -> D)', () => {
    expect(getChordNotes('C/G')).toEqual(['C', 'E', 'G']);
    expect(getChordNotes('D/F#')).toEqual(['D', 'F#', 'A']);
  });
});
