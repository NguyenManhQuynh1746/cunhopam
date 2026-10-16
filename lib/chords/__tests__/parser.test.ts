import { describe, it, expect } from 'vitest';
import { parseChord } from '../parser';

describe('parseChord', () => {
  it('phân tích chính xác các hợp âm cơ bản (C, Am, G7, F)', () => {
    const c = parseChord('C');
    expect(c).not.toBeNull();
    expect(c?.rootIndex).toBe(0);
    expect(c?.qualityKey).toBe('major');
    expect(c?.rootText).toBe('C');

    const am = parseChord('Am');
    expect(am).not.toBeNull();
    expect(am?.rootIndex).toBe(9);
    expect(am?.qualityKey).toBe('minor');
    expect(am?.qualitySuffix).toBe('m');

    const g7 = parseChord('G7');
    expect(g7?.rootIndex).toBe(7);
    expect(g7?.qualityKey).toBe('7');
  });

  it('xử lý nốt thăng (#) và giáng (b)', () => {
    const fSharp = parseChord('F#m');
    expect(fSharp?.rootIndex).toBe(6);
    expect(fSharp?.qualityKey).toBe('minor');

    const bFlat = parseChord('Bbm7');
    expect(bFlat?.rootIndex).toBe(10);
    expect(bFlat?.qualityKey).toBe('m7');
  });

  it('xử lý slash chords (G/B, C/E, D/F#)', () => {
    const gb = parseChord('G/B');
    expect(gb).not.toBeNull();
    expect(gb?.rootIndex).toBe(7); // G
    expect(gb?.bassIndex).toBe(11); // B
    expect(gb?.bassText).toBe('B');

    const cOverE = parseChord('C/E');
    expect(cOverE?.rootIndex).toBe(0);
    expect(cOverE?.bassIndex).toBe(4);
  });

  it('hỗ trợ ký hiệu nốt tiếng Việt (Đô, Rê, Mi, Fa, Sol, La, Si)', () => {
    const doM = parseChord('Đôm');
    expect(doM).not.toBeNull();
    expect(doM?.rootIndex).toBe(0);
    expect(doM?.qualityKey).toBe('minor');
    expect(doM?.isVietnameseInput).toBe(true);

    const re7 = parseChord('Rê7');
    expect(re7?.rootIndex).toBe(2);
    expect(re7?.qualityKey).toBe('7');
  });

  it('trả về null nếu chuỗi không phải là hợp âm hợp lệ', () => {
    expect(parseChord('')).toBeNull();
    expect(parseChord('Hello')).toBeNull();
    expect(parseChord('XYZ')).toBeNull();
  });
});

