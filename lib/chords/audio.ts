/**
 * Web Audio Guitar & Ukulele Sound Synthesizer
 * Tạo và phát âm thanh mô phỏng tiếng tỉa/quạt dây đàn guitar và ukulele cho hợp âm
 */

// Tần số các dây đàn guitar chuẩn (Dây 6 đến Dây 1: E2, A2, D3, G3, B3, E4)
export const GUITAR_STRING_FREQUENCIES = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

// Tần số các dây đàn ukulele chuẩn (Dây 4 đến Dây 1: G4, C4, E4, A4 - chuẩn re-entrant)
export const UKULELE_STRING_FREQUENCIES = [392.00, 261.63, 329.63, 440.00];

// Tương thích ngược
export const OPEN_STRING_FREQUENCIES = GUITAR_STRING_FREQUENCIES;

let audioCtx: AudioContext | null = null;

/**
 * Khởi tạo hoặc kích hoạt lại AudioContext
 * BẮT BUỘC phải được gọi bên trong thao tác người dùng (click/tap) để vượt qua chính sách autoplay của trình duyệt
 */
export function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioCtxClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    return audioCtx;
  } catch (err) {
    console.warn('Không thể khởi tạo Web Audio:', err);
    return null;
  }
}

/**
 * Phát âm thanh của một thế bấm guitar hoặc ukulele qua mảng số phím
 * @param frets Mảng phím (Guitar: 6 phần tử; Ukulele: 4 phần tử)
 * @param instrument Loại nhạc cụ ('guitar' | 'ukulele')
 */
export function playFretPositions(
  frets: number[],
  instrument: 'guitar' | 'ukulele' = 'guitar'
): void {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  // Tự động nhận diện nếu mảng có 4 phần tử là ukulele
  const isUke = instrument === 'ukulele' || frets.length === 4;
  const stringFreqs = isUke ? UKULELE_STRING_FREQUENCIES : GUITAR_STRING_FREQUENCIES;

  const now = ctx.currentTime + 0.02;
  let delay = 0;

  frets.forEach((fret, stringIdx) => {
    // Nếu dây bị chặn (-1 hoặc < 0) thì bỏ qua
    if (fret < 0 || stringIdx >= stringFreqs.length) return;

    // Tần số nốt = f0 * 2^(fret / 12)
    const baseFreq = stringFreqs[stringIdx];
    const freq = baseFreq * Math.pow(2, fret / 12);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sóng triangle kết hợp tạo âm sắc tương tự dây nylon/acoustic
    osc.type = isUke ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now + delay);

    // Envelope ADSR: Attack cực nhanh, Decay dần
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(isUke ? 0.22 : 0.2, now + delay + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + (isUke ? 1.2 : 1.5));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + (isUke ? 1.3 : 1.6));

    // Hiệu ứng gảy từng dây (strum) cách nhau 45-50ms
    delay += isUke ? 0.045 : 0.05;
  });
}
