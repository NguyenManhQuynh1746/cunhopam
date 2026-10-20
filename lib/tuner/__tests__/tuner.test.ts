import { describe, it, expect } from 'vitest';
import {
  frequencyToMidi,
  midiToFrequency,
  calculateCents,
  getNearestNote,
  findClosestString,
  detectPitchAutocorrelation,
} from '../pitch';
import {
  STANDARD_TUNING,
  DROP_D_TUNING,
  HALF_STEP_DOWN_TUNING,
} from '../constants';

describe('Tuner Logic & Math', () => {
  it('chuyển đổi tần số sang MIDI và ngược lại chính xác', () => {
    // A4 = 440 Hz = MIDI 69
    expect(frequencyToMidi(440)).toBeCloseTo(69, 4);
    expect(midiToFrequency(69)).toBeCloseTo(440, 2);

    // E2 = ~82.41 Hz = MIDI 40
    expect(frequencyToMidi(82.4069)).toBeCloseTo(40, 2);
    expect(midiToFrequency(40)).toBeCloseTo(82.41, 1);

    // E4 = ~329.63 Hz = MIDI 64
    expect(frequencyToMidi(329.6276)).toBeCloseTo(64, 2);
    expect(midiToFrequency(64)).toBeCloseTo(329.63, 1);
  });

  it('tính độ lệch theo cents chính xác', () => {
    // Cùng tần số -> 0 cent
    expect(calculateCents(440, 440)).toBe(0);

    // Nửa cung cao hơn (440 * 2^(1/12) ~ 466.16 Hz -> 100 cents)
    const semitoneUp = 440 * Math.pow(2, 1 / 12);
    expect(calculateCents(semitoneUp, 440)).toBeCloseTo(100, 2);

    // Nửa cung thấp hơn -> -100 cents
    const semitoneDown = 440 * Math.pow(2, -1 / 12);
    expect(calculateCents(semitoneDown, 440)).toBeCloseTo(-100, 2);

    // Lệch nhẹ +10 cent
    const tenCentsUp = 440 * Math.pow(2, 10 / 1200);
    expect(calculateCents(tenCentsUp, 440)).toBeCloseTo(10, 1);
  });

  it('xác định nốt gần nhất theo ký hiệu tiếng Anh và tiếng Việt', () => {
    // 440 Hz -> A4
    const resA4 = getNearestNote(440, false, 'en');
    expect(resA4.noteName).toBe('A');
    expect(resA4.octave).toBe(4);
    expect(resA4.fullName).toBe('A4');
    expect(resA4.cents).toBe(0);
    expect(resA4.inTune).toBe(true);

    // 440 Hz hiển thị tiếng Việt -> La 4
    const resA4Vi = getNearestNote(440, false, 'vi');
    expect(resA4Vi.noteName).toBe('La');
    expect(resA4Vi.fullName).toBe('La 4');

    // 82.41 Hz -> E2 (Dây 6 guitar)
    const resE2 = getNearestNote(82.41, false, 'en');
    expect(resE2.noteName).toBe('E');
    expect(resE2.octave).toBe(2);
    expect(resE2.inTune).toBe(true);

    // 81.0 Hz (thấp hơn E2 khoảng -30 cents)
    const resE2Flat = getNearestNote(81.0, false, 'en');
    expect(resE2Flat.noteName).toBe('E');
    expect(resE2Flat.cents).toBeLessThan(0);
    expect(resE2Flat.inTune).toBe(false);
  });

  it('tìm dây đàn tương ứng gần nhất trong tuning', () => {
    // Standard: 82.5 Hz nên nhận diện dây 6 (E2)
    const matchE2 = findClosestString(82.5, STANDARD_TUNING.strings);
    expect(matchE2).not.toBeNull();
    expect(matchE2?.string.name).toBe('E2');
    expect(matchE2?.string.stringNumber).toBe(6);
    expect(matchE2?.inTune).toBe(true); // Lệch rất ít

    // Drop D: 73.4 Hz nên nhận diện dây 6 (D2)
    const matchD2 = findClosestString(73.5, DROP_D_TUNING.strings);
    expect(matchD2?.string.name).toBe('D2');
    expect(matchD2?.string.stringNumber).toBe(6);

    // Half Step Down: 77.8 Hz nhận diện Eb2
    const matchEb2 = findClosestString(77.78, HALF_STEP_DOWN_TUNING.strings);
    expect(matchEb2?.string.name).toBe('Eb2');
    expect(matchEb2?.string.stringNumber).toBe(6);
  });

  it('nhận diện cao độ từ tín hiệu sóng âm mô phỏng (Synthetic Sine Wave)', () => {
    const sampleRate = 44100;
    const bufferLength = 4096;

    // 1. Tạo sóng sin 110 Hz (A2 - Dây 5)
    const targetFreq = 110.0;
    const bufferA2 = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      bufferA2[i] = 0.5 * Math.sin((2 * Math.PI * targetFreq * i) / sampleRate);
    }

    const detectedA2 = detectPitchAutocorrelation(bufferA2, sampleRate);
    expect(detectedA2).not.toBeNull();
    expect(Math.abs(detectedA2!.frequency - 110.0)).toBeLessThan(1.0);
    expect(detectedA2?.confidence).toBeGreaterThan(0.8);

    // 2. Tạo sóng sin 329.63 Hz (E4 - Dây 1)
    const freqE4 = 329.63;
    const bufferE4 = new Float32Array(bufferLength);
    for (let i = 0; i < bufferLength; i++) {
      bufferE4[i] = 0.5 * Math.sin((2 * Math.PI * freqE4 * i) / sampleRate);
    }

    const detectedE4 = detectPitchAutocorrelation(bufferE4, sampleRate);
    expect(detectedE4).not.toBeNull();
    expect(Math.abs(detectedE4!.frequency - 329.63)).toBeLessThan(1.5);
    expect(detectedE4?.confidence).toBeGreaterThan(0.8);

    // 3. Tín hiệu im lặng hoặc quá nhỏ (< rmsThreshold) phải trả về null
    const silentBuffer = new Float32Array(bufferLength);
    expect(detectPitchAutocorrelation(silentBuffer, sampleRate)).toBeNull();
  });
});

