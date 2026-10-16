import { ChordQualityKey, ChordQualityInfo } from './types';

// Danh sách 12 nốt theo hệ Anh (thăng và giáng)
export const EN_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const EN_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

// Danh sách 12 nốt theo hệ Việt (Đô Rê Mi)
export const VI_SHARPS = ['Đô', 'Đô#', 'Rê', 'Rê#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'] as const;
export const VI_FLATS = ['Đô', 'Rêb', 'Rê', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'] as const;

// Từ điển mapping nốt (hỗ trợ cả tiếng Anh lẫn tiếng Việt, thường lẫn hoa)
export const NOTE_TO_INDEX: Record<string, number> = {
  // English sharps & naturals
  'c': 0, 'c#': 1, 'd': 2, 'd#': 3, 'e': 4, 'f': 5, 'f#': 6, 'g': 7, 'g#': 8, 'a': 9, 'a#': 10, 'b': 11,
  // English flats
  'db': 1, 'eb': 3, 'gb': 6, 'ab': 8, 'bb': 10,
  // Vietnamese sharps & naturals
  'đô': 0, 'do': 0, 'đô#': 1, 'do#': 1,
  'rê': 2, 're': 2, 'rê#': 3, 're#': 3, 'rêb': 1, 'reb': 1,
  'mi': 4, 'mib': 3,
  'fa': 5, 'fa#': 6,
  'sol': 7, 'sol#': 8, 'solb': 6,
  'la': 9, 'la#': 10, 'lab': 8,
  'si': 11, 'sib': 10
};

// Thông tin chi tiết các loại chất hợp âm (Quality)
export const CHORD_QUALITIES: Record<ChordQualityKey, ChordQualityInfo> = {
  major: { name: 'Trưởng', suffix: '', intervals: [0, 4, 7] },
  minor: { name: 'Thứ', suffix: 'm', intervals: [0, 3, 7] },
  '7': { name: 'Bảy', suffix: '7', intervals: [0, 4, 7, 10] },
  maj7: { name: 'Trưởng bảy', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  m7: { name: 'Thứ bảy', suffix: 'm7', intervals: [0, 3, 7, 10] },
  sus4: { name: 'Sus4', suffix: 'sus4', intervals: [0, 5, 7] },
  sus2: { name: 'Sus2', suffix: 'sus2', intervals: [0, 2, 7] },
  dim: { name: 'Giảm (Dim)', suffix: 'dim', intervals: [0, 3, 6] },
  aug: { name: 'Tăng (Aug)', suffix: 'aug', intervals: [0, 4, 8] },
  '6': { name: 'Sáu', suffix: '6', intervals: [0, 4, 7, 9] },
  m6: { name: 'Thứ sáu', suffix: 'm6', intervals: [0, 3, 7, 9] }
};

// Mapping suffix viết tắt sang quality key
export const SUFFIX_MAP: Record<string, ChordQualityKey> = {
  '': 'major',
  'm': 'minor',
  'min': 'minor',
  '-': 'minor',
  '7': '7',
  'dom7': '7',
  'maj7': 'maj7',
  'M7': 'maj7',
  'm7': 'm7',
  'min7': 'm7',
  '-7': 'm7',
  'sus4': 'sus4',
  'sus': 'sus4',
  'sus2': 'sus2',
  'dim': 'dim',
  'dim7': 'dim',
  'aug': 'aug',
  '6': '6',
  'm6': 'm6'
};

// Thế tay gốc trên dây 6 (E-shape) cho các loại hợp âm
export const EF_SHAPES: Record<string, number[]> = {
  major: [0, 2, 2, 1, 0, 0],
  minor: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  maj7: [0, 2, 1, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0],
  sus2: [0, 2, 4, 4, 0, 0],
  dim: [-1, 1, 2, 0, 2, -1],
  aug: [0, 3, 2, 1, 1, 0],
  '6': [0, 2, 2, 1, 2, 0],
  m6: [0, 2, 2, 0, 2, 0]
};

// Thế tay gốc trên dây 5 (A-shape) cho các loại hợp âm
export const AF_SHAPES: Record<string, number[]> = {
  major: [-1, 0, 2, 2, 2, 0],
  minor: [-1, 0, 2, 2, 1, 0],
  '7': [-1, 0, 2, 0, 2, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  sus4: [-1, 0, 2, 2, 3, 0],
  sus2: [-1, 0, 2, 2, 0, 0],
  dim: [-1, 0, 1, 2, 1, -1],
  aug: [-1, 0, 3, 2, 2, 1],
  '6': [-1, 0, 2, 2, 2, 2],
  m6: [-1, 0, 2, 2, 1, 2]
};

// Các thế bấm mở phổ biến đặc trưng (dây buông tự nhiên)
export const OPEN_SHAPES: Record<string, number[]> = {
  '0major': [-1, 3, 2, 0, 1, 0],   // C
  '2major': [-1, -1, 0, 2, 3, 2], // D
  '2minor': [-1, -1, 0, 2, 3, 1], // Dm
  '4major': [0, 2, 2, 1, 0, 0],   // E
  '4minor': [0, 2, 2, 0, 0, 0],   // Em
  '7major': [3, 2, 0, 0, 0, 3],   // G
  '7 7':    [3, 2, 0, 0, 0, 1],   // G7
  '9major': [-1, 0, 2, 2, 2, 0],  // A
  '9minor': [-1, 0, 2, 2, 1, 0],  // Am
  '9 7':    [-1, 0, 2, 0, 2, 0],  // A7
  '0maj7':  [-1, 3, 2, 0, 0, 0]   // Cmaj7
};

// Tần số Hz các dây đàn chuẩn (E2, A2, D3, G3, B3, E4)
export const GUITAR_STRING_FREQ = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63] as const;

