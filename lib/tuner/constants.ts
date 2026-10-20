export interface TunerString {
  stringNumber: number; // 1 to 6 (1 is high E, 6 is low E)
  name: string;         // 'E4', 'B3', 'G3', 'D3', 'A2', 'E2'
  note: string;         // 'E', 'B', 'G', 'D', 'A'
  octave: number;       // 2, 3, 4
  frequency: number;    // Hz
  viName: string;       // 'Mí', 'Si', 'Sol', 'Rê', 'La', 'Mì' (or 'Mi4', 'Si3'...)
}

export interface TuningPreset {
  id: string;
  name: string;
  description: string;
  strings: TunerString[]; // Ordered from String 6 (thickest / lowest) to String 1 (thinnest / highest)
}

// Tần số nốt chuẩn theo Equal Temperament (A4 = 440 Hz)
// f = 440 * 2^((midi - 69) / 12)
export const NOTE_NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_VI = ['Đô', 'Đô#', 'Rê', 'Rê#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export const NOTE_NAMES_FLAT_EN = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const NOTE_NAMES_FLAT_VI = ['Đô', 'Rê♭', 'Rê', 'Mi♭', 'Mi', 'Fa', 'Sol♭', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];

// Tuning Chuẩn (Standard EADGBE)
export const STANDARD_TUNING: TuningPreset = {
  id: 'standard',
  name: 'Tuning chuẩn (Standard)',
  description: 'E - A - D - G - B - E (Phổ biến nhất)',
  strings: [
    { stringNumber: 6, name: 'E2', note: 'E', octave: 2, frequency: 82.41, viName: 'Mi 2' },
    { stringNumber: 5, name: 'A2', note: 'A', octave: 2, frequency: 110.0, viName: 'La 2' },
    { stringNumber: 4, name: 'D3', note: 'D', octave: 3, frequency: 146.83, viName: 'Rê 3' },
    { stringNumber: 3, name: 'G3', note: 'G', octave: 3, frequency: 196.0, viName: 'Sol 3' },
    { stringNumber: 2, name: 'B3', note: 'B', octave: 3, frequency: 246.94, viName: 'Si 3' },
    { stringNumber: 1, name: 'E4', note: 'E', octave: 4, frequency: 329.63, viName: 'Mi 4' },
  ],
};

// Tuning Drop D (DADGBE)
export const DROP_D_TUNING: TuningPreset = {
  id: 'drop_d',
  name: 'Drop D',
  description: 'Hạ dây 6 từ E xuống D (D - A - D - G - B - E)',
  strings: [
    { stringNumber: 6, name: 'D2', note: 'D', octave: 2, frequency: 73.42, viName: 'Rê 2' },
    { stringNumber: 5, name: 'A2', note: 'A', octave: 2, frequency: 110.0, viName: 'La 2' },
    { stringNumber: 4, name: 'D3', note: 'D', octave: 3, frequency: 146.83, viName: 'Rê 3' },
    { stringNumber: 3, name: 'G3', note: 'G', octave: 3, frequency: 196.0, viName: 'Sol 3' },
    { stringNumber: 2, name: 'B3', note: 'B', octave: 3, frequency: 246.94, viName: 'Si 3' },
    { stringNumber: 1, name: 'E4', note: 'E', octave: 4, frequency: 329.63, viName: 'Mi 4' },
  ],
};

// Tuning Nửa cung xuống (Half-Step Down / Eb Tuning: Eb Ab Db Gb Bb Eb)
export const HALF_STEP_DOWN_TUNING: TuningPreset = {
  id: 'half_step_down',
  name: 'Nửa cung xuống (Eb Tuning)',
  description: 'Hạ tất cả các dây xuống nửa cung (Eb - Ab - Db - Gb - Bb - Eb)',
  strings: [
    { stringNumber: 6, name: 'Eb2', note: 'Eb', octave: 2, frequency: 77.78, viName: 'Mi♭ 2' },
    { stringNumber: 5, name: 'Ab2', note: 'Ab', octave: 2, frequency: 103.83, viName: 'La♭ 2' },
    { stringNumber: 4, name: 'Db3', note: 'Db', octave: 3, frequency: 138.59, viName: 'Rê♭ 3' },
    { stringNumber: 3, name: 'Gb3', note: 'Gb', octave: 3, frequency: 185.0, viName: 'Sol♭ 3' },
    { stringNumber: 2, name: 'Bb3', note: 'Bb', octave: 3, frequency: 233.08, viName: 'Si♭ 3' },
    { stringNumber: 1, name: 'Eb4', note: 'Eb', octave: 4, frequency: 311.13, viName: 'Mi♭ 4' },
  ],
};

export const TUNING_PRESETS: TuningPreset[] = [
  STANDARD_TUNING,
  DROP_D_TUNING,
  HALF_STEP_DOWN_TUNING,
];

