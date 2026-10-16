import { describe, it, expect } from 'vitest';
import guitarChords from '@tombatossals/chords-db/lib/guitar.json';
import { getAllChordPositions } from '../diagram';
import { parseChord } from '../parser';

describe('Dữ liệu hợp âm thật từ @tombatossals/chords-db & khớp với lib/chords', () => {
  // Helper lấy hợp âm từ chords-db
  function getDbChord(key: string, suffix: string) {
    const list = (guitarChords.chords as Record<string, Array<{ key: string; suffix: string; positions: Array<{ frets: number[]; baseFret: number; barres: number[] }> }>>)[key];
    return list?.find(c => c.suffix === suffix);
  }

  it('Hợp âm C: chords-db có đủ thế bấm và khớp thế mở với lib/chords', () => {
    const dbC = getDbChord('C', 'major');
    expect(dbC).toBeDefined();
    expect(dbC!.positions.length).toBeGreaterThan(0);

    // chords-db biểu diễn phím từ dây 6 đến dây 1
    const openDb = dbC!.positions.find(p => p.baseFret === 1);
    expect(openDb).toBeDefined();
    expect(openDb!.frets).toEqual([-1, 3, 2, 0, 1, 0]);

    // Đối chiếu với lib/chords
    const libPos = getAllChordPositions('C');
    expect(libPos.length).toBeGreaterThan(0);
    expect(libPos[0].frets).toEqual(openDb!.frets);
  });

  it('Hợp âm Am: chords-db có đủ thế bấm và khớp thế mở với lib/chords', () => {
    const dbAm = getDbChord('A', 'minor');
    expect(dbAm).toBeDefined();
    expect(dbAm!.positions.length).toBeGreaterThan(0);

    const openDb = dbAm!.positions.find(p => p.baseFret === 1);
    expect(openDb).toBeDefined();
    expect(openDb!.frets).toEqual([-1, 0, 2, 2, 1, 0]);

    const libPos = getAllChordPositions('Am');
    expect(libPos.length).toBeGreaterThan(0);
    expect(libPos[0].frets).toEqual(openDb!.frets);
  });

  it('Hợp âm F: chords-db có thế bấm Barre ô 1 khớp với lib/chords', () => {
    const dbF = getDbChord('F', 'major');
    expect(dbF).toBeDefined();
    expect(dbF!.positions.length).toBeGreaterThan(0);

    const barre1Db = dbF!.positions.find(p => p.baseFret === 1 && p.barres.includes(1));
    expect(barre1Db).toBeDefined();
    expect(barre1Db!.frets).toEqual([1, 3, 3, 2, 1, 1]);

    const libPos = getAllChordPositions('F');
    const libBarre1 = libPos.find(p => p.barreFret === 1);
    expect(libBarre1).toBeDefined();
    expect(libBarre1!.frets).toEqual([1, 3, 3, 2, 1, 1]);
  });

  it('Hợp âm G7: chords-db có đủ thế bấm và khớp với lib/chords', () => {
    const dbG7 = getDbChord('G', '7');
    expect(dbG7).toBeDefined();
    expect(dbG7!.positions.length).toBeGreaterThan(0);

    const openDb = dbG7!.positions.find(p => p.baseFret === 1);
    expect(openDb).toBeDefined();
    expect(openDb!.frets).toEqual([3, 2, 0, 0, 0, 1]);

    const libPos = getAllChordPositions('G7');
    expect(libPos.length).toBeGreaterThan(0);
    expect(libPos[0].frets).toEqual(openDb!.frets);
  });

  it('Hợp âm Bm7: chords-db có thế bấm Barre ô 2 khớp với lib/chords', () => {
    const dbBm7 = getDbChord('B', 'm7');
    expect(dbBm7).toBeDefined();
    expect(dbBm7!.positions.length).toBeGreaterThan(0);

    // Barre ô 2 trong chords-db
    const barre2Db = dbBm7!.positions.find(p => p.barres.includes(2));
    expect(barre2Db).toBeDefined();
    expect(barre2Db!.barres).toContain(2);

    // Đối chiếu với lib/chords: có thế bấm Barre ô 2
    const libPos = getAllChordPositions('Bm7');
    const libBarre2 = libPos.find(p => p.barreFret === 2);
    expect(libBarre2).toBeDefined();
    expect(libBarre2!.barreFret).toBe(2);
  });

  it('Phân tích cú pháp nốt và hậu tố khớp với khóa chords-db', () => {
    const pC = parseChord('C');
    expect(pC?.rootText).toBe('C');
    expect(pC?.qualityKey).toBe('major');

    const pBm7 = parseChord('Bm7');
    expect(pBm7?.rootText).toBe('B');
    expect(pBm7?.qualityKey).toBe('m7');
  });
});
