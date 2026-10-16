export type NoteNotation = 'en' | 'vi';

export type ChordQualityKey =
  | 'major'
  | 'minor'
  | '7'
  | 'maj7'
  | 'm7'
  | 'sus4'
  | 'dim'
  | 'aug'
  | 'sus2'
  | '6'
  | 'm6';

export interface ChordQualityInfo {
  name: string;        // 'Trưởng', 'Thứ', ...
  suffix: string;      // '', 'm', '7', ...
  intervals: number[]; // [0, 4, 7], ...
}

export interface ParsedChord {
  raw: string;
  rootIndex: number;          // 0-11 (C = 0, C# = 1, ...)
  rootText: string;           // 'C', 'F#', 'Bb', ...
  qualityKey: ChordQualityKey;
  qualitySuffix: string;      // '', 'm', '7', ...
  bassIndex?: number;         // 0-11 nếu có slash chord (vd: G/B)
  bassText?: string;
  isVietnameseInput?: boolean;
}

export interface ChordPositionData {
  frets: number[];     // Mảng 6 phần tử [-1, 0, 2, 2, 1, 0] (-1 = mute, 0 = open)
  title: string;       // 'Thế mở', 'Barre ô 3', ...
  barreFret: number;   // 0 nếu không có barre, hoặc số phím barre
  barreStartString: number; // 0 = dây 6 (E thấp), 1 = dây 5 (A), ...
}

export interface ChordDiagram {
  chordName: string;
  position: ChordPositionData;
  baseFret: number;    // Vị trí phím bắt đầu vẽ sơ đồ (1, 2, 3...)
  svgString?: string;
}

