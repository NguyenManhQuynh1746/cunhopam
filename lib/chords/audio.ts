/**
 * Web Audio Guitar Sound Synthesizer
 * Tạo và phát âm thanh mô phỏng tiếng tỉa/quạt dây đàn guitar cho hợp âm
 */

// Tần số các dây đàn guitar chuẩn (Dây 6 đến Dây 1: E2, A2, D3, G3, B3, E4)
export const OPEN_STRING_FREQUENCIES = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

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
 * Phát âm thanh của một thế bấm guitar qua mảng số phím (frets: 6 phần tử từ dây 6 đến dây 1)
 * Ví dụ C major: [-1, 3, 2, 0, 1, 0] (-1 hoặc 'x' là dây không gảy)
 */
export function playFretPositions(frets: number[]): void {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.02;
  let delay = 0;

  frets.forEach((fret, stringIdx) => {
    // Nếu dây bị chặn (-1 hoặc < 0) thì bỏ qua
    if (fret < 0 || stringIdx >= OPEN_STRING_FREQUENCIES.length) return;

    // Tần số nốt = f0 * 2^(fret / 12)
    const baseFreq = OPEN_STRING_FREQUENCIES[stringIdx];
    const freq = baseFreq * Math.pow(2, fret / 12);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sóng triangle kết hợp tạo âm sắc tương tự dây nylon/acoustic
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + delay);

    // Envelope ADSR: Attack cực nhanh, Decay dần
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 1.6);

    // Hiệu ứng gảy từng dây (strum) cách nhau 50ms
    delay += 0.05;
  });
}

