import { describe, it, expect } from 'vitest';
import { chordToDiagram, getAllChordPositions, renderChordSvg } from '../diagram';

describe('chordToDiagram & getAllChordPositions', () => {
  it('tạo danh sách thế bấm cho hợp âm C', () => {
    const positions = getAllChordPositions('C');
    expect(positions.length).toBeGreaterThan(0);
    // Thế mở của C: [-1, 3, 2, 0, 1, 0]
    expect(positions[0].title).toBe('Thế mở');
    expect(positions[0].frets).toEqual([-1, 3, 2, 0, 1, 0]);
  });

  it('tạo thế bấm Barre cho hợp âm F (Barre ô 1)', () => {
    const positions = getAllChordPositions('F');
    expect(positions.length).toBeGreaterThan(0);
    const barreF = positions.find(p => p.barreFret === 1);
    expect(barreF).toBeDefined();
    expect(barreF?.title).toContain('Barre');
  });

  it('tạo sơ đồ diagram và chuỗi SVG hợp lệ', () => {
    const diagram = chordToDiagram('Am');
    expect(diagram).not.toBeNull();
    expect(diagram?.chordName).toBe('Am');
    expect(diagram?.svgString).toContain('<svg');
    expect(diagram?.svgString).toContain('</svg>');
    expect(diagram?.svgString).toContain('fill="var(--pick');
  });

  it('trả về null nếu hợp âm không hợp lệ', () => {
    const diagram = chordToDiagram('InvalidChord');
    expect(diagram).toBeNull();
  });
});

