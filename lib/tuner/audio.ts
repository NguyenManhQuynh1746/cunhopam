import { detectPitchAutocorrelation } from './pitch';

export type TunerErrorCode =
  | 'NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'INSECURE_CONTEXT'
  | 'NOT_SUPPORTED'
  | 'GENERIC_ERROR';

export interface TunerError {
  code: TunerErrorCode;
  message: string;
  details?: string;
}

export interface TunerListenerData {
  frequency: number;
  confidence: number;
  volume: number;
}

export class TunerAudioEngine {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private referenceOscillator: OscillatorNode | null = null;
  private referenceGain: GainNode | null = null;

  private onPitchCallback: ((data: TunerListenerData | null) => void) | null = null;
  private onErrorCallback: ((err: TunerError) => void) | null = null;

  public setCallbacks(
    onPitch: (data: TunerListenerData | null) => void,
    onError: (err: TunerError) => void
  ) {
    this.onPitchCallback = onPitch;
    this.onErrorCallback = onError;
  }

  /**
   * Bắt đầu thu âm từ micro và phân tích cao độ
   */
  public async start(): Promise<boolean> {
    if (this.isRunning) return true;

    // 1. Kiểm tra môi trường an toàn (HTTPS / localhost)
    if (typeof window === 'undefined') return false;

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      this.onErrorCallback?.({
        code: 'INSECURE_CONTEXT',
        message: 'Trình duyệt yêu cầu kết nối bảo mật (HTTPS) để truy cập micro.',
      });
      return false;
    }

    // 2. Kiểm tra hỗ trợ Web Audio API & MediaDevices
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onErrorCallback?.({
        code: 'NOT_SUPPORTED',
        message: 'Trình duyệt này không hỗ trợ ghi âm trực tiếp qua Web Audio API.',
      });
      return false;
    }

    try {
      // 3. Yêu cầu quyền truy cập micro
      // Tắt các bộ lọc giọng nói như echoCancellation, noiseSuppression để giữ trọn vẹn tần số đàn guitar
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // 4. Khởi tạo AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // 5. Kết nối Source -> Analyser
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 2048;

      this.sourceNode.connect(this.analyserNode);

      this.isRunning = true;

      // 6. Bắt đầu vòng lặp lấy mẫu
      const sampleRate = this.audioCtx.sampleRate;
      const buffer = new Float32Array(this.analyserNode.fftSize);

      const loop = () => {
        if (!this.isRunning || !this.analyserNode) return;

        this.analyserNode.getFloatTimeDomainData(buffer);

        const result = detectPitchAutocorrelation(buffer, sampleRate, {
          minFreq: 60,
          maxFreq: 650,
          rmsThreshold: 0.007,
        });

        this.onPitchCallback?.(result);

        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
      return true;
    } catch (err: any) {
      this.stop();

      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        this.onErrorCallback?.({
          code: 'NOT_ALLOWED',
          message: 'Bạn đã từ chối quyền truy cập micro. Hãy bấm vào biểu tượng ổ khoá trên thanh địa chỉ trình duyệt để cấp quyền micro.',
        });
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        this.onErrorCallback?.({
          code: 'NOT_FOUND',
          message: 'Không tìm thấy thiết bị micro nào trên máy của bạn.',
        });
      } else {
        this.onErrorCallback?.({
          code: 'GENERIC_ERROR',
          message: err?.message || 'Không thể truy cập micro để chỉnh dây.',
          details: String(err),
        });
      }
      return false;
    }
  }

  /**
   * Dừng bộ thu âm và giải phóng tài nguyên
   */
  public stop() {
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      try {
        this.analyserNode.disconnect();
      } catch {}
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }

    this.stopTone();
    this.onPitchCallback?.(null);
  }

  /**
   * Phát âm thanh mẫu (Reference tone) của nốt để người dùng có thể nghe thử bằng tai
   */
  public playTone(frequency: number, durationMs = 2500) {
    this.stopTone();

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = this.audioCtx && this.audioCtx.state !== 'closed' ? this.audioCtx : new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Âm sắc ấm, gần giống tiếng đàn
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Envelope ADSR mượt mà
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationMs / 1000);

      this.referenceOscillator = osc;
      this.referenceGain = gain;
    } catch (e) {
      console.warn('Cannot play reference tone:', e);
    }
  }

  /**
   * Dừng âm thanh mẫu
   */
  public stopTone() {
    if (this.referenceOscillator) {
      try {
        this.referenceOscillator.stop();
        this.referenceOscillator.disconnect();
      } catch {}
      this.referenceOscillator = null;
    }
    if (this.referenceGain) {
      try {
        this.referenceGain.disconnect();
      } catch {}
      this.referenceGain = null;
    }
  }
}

