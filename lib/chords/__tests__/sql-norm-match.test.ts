import { describe, it, expect } from 'vitest';
import { normalizeChordName } from '../normalize';

/**
 * Mô phỏng hàm PostgreSQL public.normalize_chord_name(p_chord text) để đối chiếu 1:1
 */
function sqlNormalizeChordName(chord: string): string {
  if (!chord || !chord.trim()) return '';
  let v_chord = chord.trim();

  // 1. Cắt bỏ nốt bass của Slash chord (C/G -> C)
  const slashIdx = v_chord.indexOf('/');
  if (slashIdx !== -1) {
    v_chord = v_chord.substring(0, slashIdx).trim();
  }

  // 2. Tách nốt gốc và hậu tố bằng regex
  const match = v_chord.match(/^([A-Ga-g][#b]?|[ĐđDd][oôOÔ]#?|[Rr][eêEÊ]#?|[Mm]i#?|[Ff]a#?|[Ss]ol#?|[Ll]a#?|[Ss]i#?)/i);
  if (!match) return v_chord;

  let v_root = match[1];
  let v_suffix = v_chord.substring(v_root.length);
  let v_upper = v_root.toUpperCase()
    .replace(/[Đđ]/g, 'D')
    .replace(/[Ôô]/g, 'O')
    .replace(/[Êê]/g, 'E');

  if (['C', 'DO'].includes(v_upper)) v_root = 'C';
  else if (['C#', 'DB', 'DO#'].includes(v_upper)) v_root = 'C#';
  else if (['D', 'RE'].includes(v_upper)) v_root = 'D';
  else if (['D#', 'EB', 'RE#'].includes(v_upper)) v_root = 'D#';
  else if (['E', 'FB', 'MI'].includes(v_upper)) v_root = 'E';
  else if (['F', 'E#', 'FA'].includes(v_upper)) v_root = 'F';
  else if (['F#', 'GB', 'FA#'].includes(v_upper)) v_root = 'F#';
  else if (['G', 'SOL'].includes(v_upper)) v_root = 'G';
  else if (['G#', 'AB', 'SOL#'].includes(v_upper)) v_root = 'G#';
  else if (['A', 'LA'].includes(v_upper)) v_root = 'A';
  else if (['A#', 'BB', 'LA#'].includes(v_upper)) v_root = 'A#';
  else if (['B', 'CB', 'SI'].includes(v_upper)) v_root = 'B';
  else v_root = v_upper;

  if (v_suffix === 'M' || v_suffix === 'major') v_suffix = '';
  else if (v_suffix === 'min') v_suffix = 'm';
  else if (v_suffix === 'M7') v_suffix = 'maj7';

  return v_root + (v_suffix || '');
}

describe('Đối chiếu chuẩn hoá tên hợp âm giữa TypeScript và PostgreSQL', () => {
  const testCases = [
    'Bb',
    'A#',
    'C/G',
    'D/F#',
    'G/B',
    'Dm7',
    'Bbm7',
    'F#m7',
    'Eb',
    'Dbmaj7',
    'Abdim',
    'Cadd9',
    'Đô',
    'Lam',
    'Sol7',
    'Em',
    'A/C#',
  ];

  for (const chord of testCases) {
    it(`khớp chuẩn 1:1 cho hợp âm "${chord}"`, () => {
      const tsResult = normalizeChordName(chord);
      const sqlResult = sqlNormalizeChordName(chord);
      expect(tsResult).toBe(sqlResult);
    });
  }
});
