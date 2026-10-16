import { EF_SHAPES, AF_SHAPES, OPEN_SHAPES } from './constants';
import { parseChord } from './parser';
import { ChordDiagram, ChordPositionData } from './types';

/**
 * Lấy tất cả thế bấm khả thi của một hợp âm
 */
export function getAllChordPositions(chordStr: string): ChordPositionData[] {
  const parsed = parseChord(chordStr);
  if (!parsed) return [];

  const r = parsed.rootIndex;
  const k = parsed.qualityKey;
  const positions: ChordPositionData[] = [];
  const seen = new Set<string>();

  const add = (frets: number[], title: string, barreFret: number, barreStartString: number) => {
    const key = frets.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      positions.push({ frets, title, barreFret, barreStartString });
    }
  };

  // 1. Kiểm tra thế mở đặc trưng
  const openKey = `${r}${k === '7' ? ' 7' : k}`;
  const openShape = OPEN_SHAPES[openKey];
  if (openShape) {
    add(openShape, 'Thế mở', 0, 0);
  }

  // 2. Thế bấm Barre gốc dây 6 (E-shape)
  const efOffset = (r - 4 + 12) % 12;
  const efBase = EF_SHAPES[k] || EF_SHAPES.major;
  if (efBase) {
    const efFrets = efBase.map(x => (x < 0 ? -1 : x + efOffset));
    add(efFrets, efOffset === 0 ? 'Thế mở' : `Barre ô ${efOffset}`, efOffset, 0);
  }

  // 3. Thế bấm Barre gốc dây 5 (A-shape)
  const afOffset = (r - 9 + 12) % 12;
  const afBase = AF_SHAPES[k] || AF_SHAPES.major;
  if (afBase) {
    const afFrets = afBase.map(x => (x < 0 ? -1 : x + afOffset));
    add(afFrets, afOffset === 0 ? 'Thế mở' : `Barre ô ${afOffset}`, afOffset, 1);
  }

  return positions;
}

/**
 * Lấy sơ đồ thế bấm cho hợp âm (mặc định lấy thế bấm đầu tiên / phổ biến nhất)
 */
export function chordToDiagram(chordStr: string, positionIndex = 0): ChordDiagram | null {
  const positions = getAllChordPositions(chordStr);
  if (!positions.length) return null;

  const posIdx = Math.max(0, Math.min(positionIndex, positions.length - 1));
  const pos = positions[posIdx];

  const positiveFrets = pos.frets.filter(x => x > 0);
  const maxFret = Math.max(0, ...positiveFrets);
  const baseFret = maxFret <= 5 ? 1 : Math.min(...positiveFrets);

  const diagram: ChordDiagram = {
    chordName: chordStr,
    position: pos,
    baseFret,
  };

  diagram.svgString = renderChordSvg(diagram);
  return diagram;
}

/**
 * Render chuỗi SVG sơ đồ ngón bấm phím đàn guitar (giữ đúng style cobalt & pick từ index.html)
 */
export function renderChordSvg(diagram: ChordDiagram): string {
  const { position, baseFret } = diagram;
  const { frets, barreFret, barreStartString } = position;

  const sx = (i: number) => 40 + i * 32;
  const top = 60;
  const rh = 42;
  let lines = '';

  // 6 phím ngang (frets)
  for (let i = 0; i <= 5; i++) {
    const isNut = i === 0 && baseFret === 1;
    lines += `<line class="ln2" x1="40" x2="200" y1="${top + i * rh}" y2="${top + i * rh}" stroke="currentColor" stroke-width="${isNut ? 6 : 1.2}" opacity="${isNut ? 1 : 0.35}"/>`;
  }

  // 6 dây dọc (strings: từ dây 6 sang dây 1)
  for (let i = 0; i < 6; i++) {
    lines += `<line class="ln2" x1="${sx(i)}" x2="${sx(i)}" y1="${top}" y2="${top + 5 * rh}" stroke="currentColor" stroke-width="${1 + (5 - i) * 0.25}" opacity="0.7"/>`;
  }

  // Thanh Barre chặn ngón trỏ (nếu có)
  if (barreFret > 0 && barreFret >= baseFret && barreFret < baseFret + 5) {
    const y = top + (barreFret - baseFret + 0.5) * rh;
    const xStart = sx(barreStartString) - 11;
    const width = sx(5) - sx(barreStartString) + 22;
    lines += `<rect x="${xStart}" y="${y - 11}" width="${width}" height="22" rx="11" fill="var(--accent, #2838d8)"/>`;
  }

  // Các điểm bấm ngón / dây buông / dây câm
  frets.forEach((f, i) => {
    if (f < 0) {
      // Dây câm (X)
      lines += `<text class="tx" x="${sx(i)}" y="44" text-anchor="middle" font-size="18" font-weight="600" fill="var(--muted, #5b6579)">×</text>`;
    } else if (f === 0) {
      // Dây buông (O)
      lines += `<circle cx="${sx(i)}" cy="38" r="7" fill="none" stroke="var(--muted, #5b6579)" stroke-width="2"/>`;
    } else {
      // Nốt bấm (chấm vàng pick viền tối)
      const cy = top + (f - baseFret + 0.5) * rh;
      lines += `<circle cx="${sx(i)}" cy="${cy}" r="13" fill="var(--pick, #ffc933)" stroke="var(--ink, #101828)" stroke-width="1.5"/>`;
    }
  });

  // Số phím bắt đầu (nếu phím > 1)
  if (baseFret > 1) {
    lines += `<text class="tx" x="10" y="${top + rh * 0.5 + 5}" font-size="13" font-weight="600" fill="var(--muted, #5b6579)">ô ${baseFret}</text>`;
  }

  return `<svg viewBox="0 0 240 290" aria-label="Sơ đồ hợp âm" class="w-full h-auto max-w-[240px] select-none">${lines}</svg>`;
}

