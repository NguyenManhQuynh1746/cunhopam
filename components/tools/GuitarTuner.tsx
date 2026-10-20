'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  TUNING_PRESETS,
  STANDARD_TUNING,
  TuningPreset,
  TunerString,
} from '@/lib/tuner/constants';
import {
  getNearestNote,
  findClosestString,
  calculateCents,
  NearestNoteResult,
} from '@/lib/tuner/pitch';
import { TunerAudioEngine, TunerError, TunerListenerData } from '@/lib/tuner/audio';

export function GuitarTuner() {
  const { notation } = useApp();

  // Cấu hình tuning đang chọn
  const [activeTuning, setActiveTuning] = useState<TuningPreset>(STANDARD_TUNING);

  // Chế độ: 'auto' (tự nhận diện) hoặc 'manual' (chọn dây cố định)
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [selectedStringNumber, setSelectedStringNumber] = useState<number>(6); // Mặc định dây 6 (E2)

  // Trạng thái thu âm
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<TunerError | null>(null);

  // Dữ liệu đo được hiện tại
  const [currentFrequency, setCurrentFrequency] = useState<number | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [nearestNote, setNearestNote] = useState<NearestNoteResult | null>(null);
  const [detectedString, setDetectedString] = useState<TunerString | null>(null);
  const [centsDeviation, setCentsDeviation] = useState<number>(0);
  const [isInTune, setIsInTune] = useState<boolean>(false);

  // Âm thanh mẫu đang phát
  const [playingStringNumber, setPlayingStringNumber] = useState<number | null>(null);

  // Engine Web Audio
  const engineRef = useRef<TunerAudioEngine | null>(null);

  // Bộ lọc làm mượt kim (smoothing filter)
  const smoothedCentsRef = useRef<number>(0);

  useEffect(() => {
    const engine = new TunerAudioEngine();
    engineRef.current = engine;

    engine.setCallbacks(
      (data: TunerListenerData | null) => {
        if (!data || data.frequency <= 0) {
          setCurrentVolume(0);
          return;
        }

        setCurrentFrequency(data.frequency);
        setCurrentVolume(data.volume);

        // Tính nốt gần nhất theo chromatic
        const note = getNearestNote(data.frequency, activeTuning.id === 'half_step_down', notation);
        setNearestNote(note);

        if (mode === 'auto') {
          // Chế độ tự nhận diện dây trong tuning
          const closest = findClosestString(data.frequency, activeTuning.strings);
          if (closest) {
            setDetectedString(closest.string);
            // Làm mượt cent để kim không bị giật
            const alpha = 0.35;
            smoothedCentsRef.current =
              smoothedCentsRef.current * (1 - alpha) + closest.cents * alpha;
            const smoothed = Number(smoothedCentsRef.current.toFixed(1));
            setCentsDeviation(smoothed);
            setIsInTune(Math.abs(smoothed) <= 3);
          }
        } else {
          // Chế độ thủ công: so sánh với dây đã chọn
          const targetStr = activeTuning.strings.find(
            (s) => s.stringNumber === selectedStringNumber
          );
          if (targetStr) {
            setDetectedString(targetStr);
            const cents = calculateCents(data.frequency, targetStr.frequency);
            const clamped = Math.max(-50, Math.min(50, cents));
            const alpha = 0.35;
            smoothedCentsRef.current =
              smoothedCentsRef.current * (1 - alpha) + clamped * alpha;
            const smoothed = Number(smoothedCentsRef.current.toFixed(1));
            setCentsDeviation(smoothed);
            setIsInTune(Math.abs(smoothed) <= 3);
          }
        }
      },
      (err: TunerError) => {
        setError(err);
        setIsListening(false);
      }
    );

    return () => {
      engine.stop();
    };
  }, [activeTuning, mode, selectedStringNumber, notation]);

  // Bật/tắt micro
  const toggleListening = async () => {
    if (!engineRef.current) return;

    if (isListening) {
      engineRef.current.stop();
      setIsListening(false);
      setCurrentFrequency(null);
      setCurrentVolume(0);
    } else {
      setError(null);
      const success = await engineRef.current.start();
      setIsListening(success);
    }
  };

  // Phát âm mẫu của một dây
  const handlePlayReference = (str: TunerString) => {
    if (!engineRef.current) return;
    if (playingStringNumber === str.stringNumber) {
      engineRef.current.stopTone();
      setPlayingStringNumber(null);
    } else {
      engineRef.current.playTone(str.frequency);
      setPlayingStringNumber(str.stringNumber);
      setTimeout(() => {
        setPlayingStringNumber((prev) => (prev === str.stringNumber ? null : prev));
      }, 2500);
    }
  };

  // Góc quay của kim chỉ (-45 độ đến +45 độ)
  const needleRotation = Math.max(-45, Math.min(45, (centsDeviation / 50) * 45));

  // Xác định dây đang được nhắm tới
  const currentTargetString =
    mode === 'manual'
      ? activeTuning.strings.find((s) => s.stringNumber === selectedStringNumber)
      : detectedString || activeTuning.strings[0];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 1. Thanh điều khiển: Preset tuning & Chế độ Auto/Manual */}
      <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
              Kiểu Tuning (Cách lên dây)
            </label>
            <div className="flex flex-wrap gap-2">
              {TUNING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setActiveTuning(preset)}
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    activeTuning.id === preset.id
                      ? 'bg-accent text-bg shadow-sm'
                      : 'bg-bg hover:bg-surface border border-line text-ink'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
              Chế độ nhận dây
            </label>
            <div className="inline-flex rounded-xl bg-bg border border-line p-1">
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'auto'
                    ? 'bg-ink text-bg shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Tự động (Auto)
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'manual'
                    ? 'bg-ink text-bg shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Chọn dây (Manual)
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted">
          💡 {activeTuning.description}
        </p>
      </div>

      {/* 2. Cảnh báo lỗi micro nếu có */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-500 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold">{error.message}</p>
            {error.code === 'NOT_ALLOWED' && (
              <p className="text-xs text-rose-400">
                Hãy kiểm tra cài đặt quyền riêng tư trên trình duyệt (hoặc trong Cài đặt iPhone/Android &gt; Safari / Chrome &gt; Bật Micro) rồi tải lại trang.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. ĐỒNG HỒ KIM ĐO CENT (GAUGE) & HIỂN THỊ NỐT */}
      <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center relative overflow-hidden">
        {/* Chỉ báo trạng thái In Tune */}
        <div
          className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
            isInTune
              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
              : 'bg-muted/10 text-muted border border-transparent'
          }`}
        >
          {isInTune ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ĐÃ CHUẨN!</span>
            </>
          ) : (
            <span>Đang đo...</span>
          )}
        </div>

        {/* Nốt hiển thị lớn trung tâm */}
        <div className="text-center my-2">
          <div className="text-6xl sm:text-7xl font-black tracking-tight text-ink flex items-baseline justify-center gap-1">
            <span>
              {notation === 'vi'
                ? nearestNote?.noteName || (currentTargetString?.viName.split(' ')[0] ?? 'E')
                : nearestNote?.noteName || (currentTargetString?.note ?? 'E')}
            </span>
            <span className="text-2xl sm:text-3xl text-muted font-bold">
              {nearestNote?.octave ?? currentTargetString?.octave ?? 2}
            </span>
          </div>

          <div className="text-sm font-medium text-muted mt-1 flex items-center justify-center gap-3">
            <span>
              Tần số: <strong className="text-ink">{currentFrequency ? `${currentFrequency.toFixed(1)} Hz` : '-- Hz'}</strong>
            </span>
            <span>•</span>
            <span>
              Mục tiêu: <strong className="text-ink">{currentTargetString ? `${currentTargetString.frequency.toFixed(1)} Hz` : '--'}</strong>
            </span>
          </div>
        </div>

        {/* GAUGE & KIM CHỈ (SVG DIAL) */}
        <div className="w-full max-w-xs sm:max-w-sm aspect-[2/1] relative flex items-end justify-center mt-4">
          <svg
            viewBox="0 0 200 110"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            {/* Vòng cung nền */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-line"
            />

            {/* Vùng chuẩn xanh lục ở giữa (-3 cent đến +3 cent) */}
            <path
              d="M 95 100 A 80 80 0 0 1 105 100"
              fill="none"
              stroke="var(--accent, #10b981)"
              strokeWidth="8"
              className={isInTune ? 'text-emerald-500 animate-pulse' : 'text-emerald-500/70'}
            />

            {/* Các vạch chia độ: -50, -40, -30, -20, -10, 0, +10, +20, +30, +40, +50 */}
            {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((cent) => {
              const angle = (cent / 50) * 45; // -45deg to +45deg
              const rad = ((angle - 90) * Math.PI) / 180;
              const r1 = 80;
              const r2 = cent === 0 ? 66 : cent % 20 === 0 ? 70 : 74;
              const x1 = 100 + r1 * Math.cos(rad);
              const y1 = 100 + r1 * Math.sin(rad);
              const x2 = 100 + r2 * Math.cos(rad);
              const y2 = 100 + r2 * Math.sin(rad);

              const isZero = cent === 0;

              return (
                <g key={cent}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth={isZero ? 2.5 : 1.5}
                    className={
                      isZero
                        ? isInTune
                          ? 'text-emerald-500'
                          : 'text-muted'
                        : 'text-line'
                    }
                  />
                  {cent % 20 === 0 && (
                    <text
                      x={100 + 56 * Math.cos(rad)}
                      y={100 + 56 * Math.sin(rad) + 3}
                      fontSize="7"
                      textAnchor="middle"
                      fill="currentColor"
                      className="text-muted font-bold select-none"
                    >
                      {cent > 0 ? `+${cent}` : cent}
                    </text>
                  )}
                </g>
              );
            })}

            {/* KIM CHỈ (NEEDLE) */}
            <g
              style={{
                transform: `rotate(${needleRotation}deg)`,
                transformOrigin: '100px 100px',
                transition: 'transform 0.08s ease-out',
              }}
            >
              {/* Thân kim */}
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="24"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className={
                  isInTune
                    ? 'text-emerald-500'
                    : Math.abs(centsDeviation) > 20
                    ? 'text-rose-500'
                    : 'text-amber-500'
                }
              />
              {/* Trục kim */}
              <circle cx="100" cy="100" r="6" fill="currentColor" className="text-ink" />
              <circle cx="100" cy="100" r="2.5" fill="var(--bg, #fff)" />
            </g>
          </svg>
        </div>

        {/* Hướng dẫn căn chỉnh: Chùng / Căng / Chuẩn */}
        <div className="mt-4 text-center">
          <div className="text-lg font-bold">
            {isInTune ? (
              <span className="text-emerald-500 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> Chuẩn âm (In Tune)
              </span>
            ) : centsDeviation < -3 ? (
              <span className="text-amber-500">
                ▲ Vặn chặt lên ({centsDeviation} cent)
              </span>
            ) : centsDeviation > 3 ? (
              <span className="text-amber-500">
                ▼ Nới lỏng ra (+{centsDeviation} cent)
              </span>
            ) : (
              <span className="text-muted">Gảy một dây để bắt đầu đo</span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            {currentTargetString
              ? `Đang căn chỉnh: Dây ${currentTargetString.stringNumber} (${notation === 'vi' ? currentTargetString.viName : currentTargetString.name})`
              : 'Hãy gảy đàn để nhận diện nốt'}
          </p>
        </div>

        {/* Nút bật/tắt Micro to bản */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={toggleListening}
            className={`px-6 py-3.5 rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 ${
              isListening
                ? 'bg-rose-500 text-white hover:bg-rose-600'
                : 'bg-accent text-bg hover:opacity-90'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>Dừng Micro</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Bật Micro để chỉnh dây</span>
              </>
            )}
          </button>

          {/* Vạch âm lượng micro */}
          {isListening && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-semibold">Âm lượng:</span>
              <div className="w-20 h-2 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, currentVolume * 400)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. BẢNG 6 DÂY GUITAR (STRING PICKER & AUDIO TONE) */}
      <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
            Các dây đàn ({activeTuning.name})
          </h2>
          <span className="text-xs text-muted">
            Chạm vào dây để chọn hoặc nghe nốt mẫu
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {activeTuning.strings.map((str) => {
            const isSelected =
              mode === 'manual'
                ? selectedStringNumber === str.stringNumber
                : detectedString?.stringNumber === str.stringNumber;
            const isPlaying = playingStringNumber === str.stringNumber;

            return (
              <div
                key={str.stringNumber}
                onClick={() => {
                  if (mode === 'manual') {
                    setSelectedStringNumber(str.stringNumber);
                  }
                }}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-accent/10 border-accent text-ink shadow-xs'
                    : 'bg-bg border-line hover:border-muted/50 text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isSelected ? 'bg-accent text-bg' : 'bg-surface border border-line text-muted'
                    }`}
                  >
                    {str.stringNumber}
                  </div>
                  <div>
                    <div className="font-black text-sm">
                      {notation === 'vi' ? str.viName : str.name}
                    </div>
                    <div className="text-[11px] text-muted">
                      {str.frequency.toFixed(1)} Hz
                    </div>
                  </div>
                </div>

                {/* Nút phát âm mẫu */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayReference(str);
                  }}
                  className={`p-2 rounded-xl transition-colors ${
                    isPlaying
                      ? 'bg-accent text-bg'
                      : 'hover:bg-surface text-muted hover:text-ink'
                  }`}
                  title={`Nghe thử âm mẫu dây ${str.stringNumber} (${str.name})`}
                  aria-label={`Nghe nốt mẫu dây ${str.stringNumber}`}
                >
                  <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Hướng dẫn sử dụng chỉnh dây nhanh */}
      <div className="bg-surface/50 border border-line rounded-2xl p-4 text-xs text-muted space-y-2">
        <div className="font-bold text-ink">💡 Hướng dẫn chỉnh dây chuẩn xác:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Ngồi ở nơi yên tĩnh, để micro điện thoại/máy tính gần thùng đàn (khoảng 20-30 cm).</li>
          <li>Gảy từng dây đàn một cách dứt khoát, để dây ngân tự nhiên khoảng 2-3 giây.</li>
          <li>Quan sát kim chỉ: nếu kim lệch về bên trái (-), hãy vặn chốt dây chặt lên; nếu kim lệch về bên phải (+), hãy nới lỏng ra.</li>
          <li>Khi kim chỉ thẳng vào giữa vạch màu xanh lục và hiện "ĐÃ CHUẨN!", dây đó đã hoàn hảo.</li>
        </ul>
      </div>
    </div>
  );
}

