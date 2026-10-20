import {
  NOTE_NAMES_EN,
  NOTE_NAMES_VI,
  NOTE_NAMES_FLAT_EN,
  NOTE_NAMES_FLAT_VI,
  TunerString,
} from './constants';

export interface NearestNoteResult {
  noteIndex: number;       // 0 = C, 1 = C#/Db, ..., 11 = B
  noteName: string;        // 'E', 'Mi', 'Eb', etc.
  octave: number;          // 2, 3, 4...
  fullName: string;        // 'E2', 'Mi 2'
  targetFrequency: number; // Tần số lý tưởng của nốt (Hz)
  cents: number;           // Độ lệch tính theo cent (-50 đến +50)
  inTune: boolean;         // |cents| <= 3
}

/**
 * Tính số MIDI từ tần số (A4 = 440 Hz = MIDI 69)
 */
export function frequencyToMidi(freq: number): number {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Tính tần số lý tưởng từ số MIDI
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Tính độ lệch giữa 2 tần số theo đơn vị cents (1 nửa cung = 100 cents)
 * cents = 1200 * log2(actualFreq / targetFreq)
 */
export function calculateCents(actualFreq: number, targetFreq: number): number {
  if (actualFreq <= 0 || targetFreq <= 0) return 0;
  return 1200 * Math.log2(actualFreq / targetFreq);
}

/**
 * Tìm nốt nhạc gần nhất từ một tần số bất kỳ
 */
export function getNearestNote(
  frequency: number,
  preferFlat = false,
  notation: 'en' | 'vi' = 'en',
  inTuneThreshold = 3
): NearestNoteResult {
  if (frequency <= 0) {
    return {
      noteIndex: 0,
      noteName: 'C',
      octave: 4,
      fullName: 'C4',
      targetFrequency: 261.63,
      cents: 0,
      inTune: false,
    };
  }

  const exactMidi = frequencyToMidi(frequency);
  const roundedMidi = Math.round(exactMidi);
  const targetFrequency = midiToFrequency(roundedMidi);
  const cents = calculateCents(frequency, targetFrequency);

  // Note index trong quãng 12 nửa cung (0 = C, 9 = A)
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;

  let noteName = '';
  if (notation === 'vi') {
    noteName = preferFlat ? NOTE_NAMES_FLAT_VI[noteIndex] : NOTE_NAMES_VI[noteIndex];
  } else {
    noteName = preferFlat ? NOTE_NAMES_FLAT_EN[noteIndex] : NOTE_NAMES_EN[noteIndex];
  }

  const fullName = notation === 'vi' ? `${noteName} ${octave}` : `${noteName}${octave}`;

  return {
    noteIndex,
    noteName,
    octave,
    fullName,
    targetFrequency: Number(targetFrequency.toFixed(2)),
    cents: Math.max(-50, Math.min(50, Number(cents.toFixed(1)))),
    inTune: Math.abs(cents) <= inTuneThreshold,
  };
}

/**
 * Tìm dây đàn tương ứng gần nhất trong danh sách dây của tuning đang chọn
 */
export function findClosestString(
  frequency: number,
  strings: TunerString[]
): { string: TunerString; cents: number; inTune: boolean } | null {
  if (!strings || strings.length === 0 || frequency <= 0) return null;

  let bestString = strings[0];
  let minAbsCents = Infinity;
  let bestCents = 0;

  for (const str of strings) {
    const cents = calculateCents(frequency, str.frequency);
    const absCents = Math.abs(cents);
    if (absCents < minAbsCents) {
      minAbsCents = absCents;
      bestString = str;
      bestCents = cents;
    }
  }

  return {
    string: bestString,
    cents: Math.max(-50, Math.min(50, Number(bestCents.toFixed(1)))),
    inTune: Math.abs(bestCents) <= 3,
  };
}

/**
 * Thuật toán nhận diện cao độ (Pitch Detection) bằng Tương quan tự thân (Autocorrelation)
 * với chọn đỉnh đầu tiên vượt trội (First Prominent Peak Picking) và nội suy Parabolic.
 *
 * Chạy hoàn toàn nội bộ trong trình duyệt, siêu nhẹ, không cần thư viện ngoài.
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number,
  options: {
    minFreq?: number;      // Mặc định 60 Hz (dưới nốt D2 = 73.4Hz)
    maxFreq?: number;      // Mặc định 600 Hz (trên nốt E4 = 329.6Hz)
    rmsThreshold?: number; // Ngưỡng âm lượng tối thiểu (tránh nhận diện tiếng ồn nền)
  } = {}
): { frequency: number; confidence: number; volume: number } | null {
  const minFreq = options.minFreq ?? 60;
  const maxFreq = options.maxFreq ?? 600;
  const rmsThreshold = options.rmsThreshold ?? 0.008;

  const bufferLength = buffer.length;

  // 1. Tính RMS (Root Mean Square) để kiểm tra âm lượng
  let sumSquares = 0;
  for (let i = 0; i < bufferLength; i++) {
    const val = buffer[i];
    sumSquares += val * val;
  }
  const rms = Math.sqrt(sumSquares / bufferLength);

  // Nếu tín hiệu quá nhỏ (tiếng gió / nhiễu nền), bỏ qua
  if (rms < rmsThreshold) {
    return null;
  }

  // 2. Xác định phạm vi lag (độ trễ) tương ứng với minFreq và maxFreq
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);

  if (maxLag >= bufferLength) {
    return null;
  }

  // 3. Tính hàm tự tương quan (Autocorrelation)
  let zeroLagCorrelation = 0;
  for (let i = 0; i < bufferLength - maxLag; i++) {
    zeroLagCorrelation += buffer[i] * buffer[i];
  }

  if (zeroLagCorrelation <= 0) return null;

  const correlations = new Float32Array(maxLag + 2);
  let globalMax = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < bufferLength - maxLag; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = sum;
    if (sum > globalMax) {
      globalMax = sum;
    }
  }

  if (globalMax <= 0) return null;

  // 4. Chọn đỉnh cục bộ ĐẦU TIÊN đạt ít nhất 80% của globalMax
  // Giúp nhận diện chính xác chu kỳ gốc T thay vì rơi vào chu kỳ bội (2T, 3T, 5T...)
  const peakThreshold = globalMax * 0.8;
  let bestLag = -1;

  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (
      correlations[lag] > correlations[lag - 1] &&
      correlations[lag] > correlations[lag + 1] &&
      correlations[lag] >= peakThreshold
    ) {
      bestLag = lag;
      break;
    }
  }

  // Fallback nếu không có đỉnh nào thoả peakThreshold
  if (bestLag <= 0) {
    let maxPeak = 0;
    for (let lag = minLag + 1; lag < maxLag; lag++) {
      if (correlations[lag] > correlations[lag - 1] && correlations[lag] > correlations[lag + 1]) {
        if (correlations[lag] > maxPeak) {
          maxPeak = correlations[lag];
          bestLag = lag;
        }
      }
    }
  }

  if (bestLag <= 0) return null;

  const confidence = correlations[bestLag] / zeroLagCorrelation;
  if (confidence < 0.4) {
    return null;
  }

  // 5. Nội suy Parabolic để đạt độ chính xác cao độ cao hơn độ phân giải mẫu
  const y1 = correlations[bestLag - 1];
  const y2 = correlations[bestLag];
  const y3 = correlations[bestLag + 1];

  const denominator = 2 * (2 * y2 - y1 - y3);
  let refinedLag = bestLag;
  if (denominator !== 0) {
    const delta = (y1 - y3) / denominator;
    refinedLag = bestLag + delta;
  }

  const frequency = sampleRate / refinedLag;

  if (frequency < minFreq || frequency > maxFreq) {
    return null;
  }

  return {
    frequency: Number(frequency.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    volume: Number(rms.toFixed(3)),
  };
}

