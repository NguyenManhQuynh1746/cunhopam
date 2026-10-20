'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  ChevronDown,
  Volume2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
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
  const [isTuningMenuOpen, setIsTuningMenuOpen] = useState(false);

  // Chế độ: 'auto' (tự nhận diện) hoặc 'manual' (chọn dây cố định)
  const [isAuto, setIsAuto] = useState<boolean>(true);
  const [selectedStringNum, setSelectedStringNum] = useState<number>(6); // Mặc định dây 6 (E2)

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
  const [playingStringNum, setPlayingStringNum] = useState<number | null>(null);

  // Engine Web Audio
  const engineRef = useRef<TunerAudioEngine | null>(null);
  const smoothedCentsRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi tạo audio engine
  useEffect(() => {
    const engine = new TunerAudioEngine();
    engineRef.current = engine;

    engine.setCallbacks(
      (data: TunerListenerData | null) => {
        if (!data || data.frequency <= 0) {
          setCurrentVolume(0);
          if (!silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              setCurrentFrequency(null);
              setIsInTune(false);
            }, 1200);
          }
          return;
        }

        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        setCurrentFrequency(data.frequency);
        setCurrentVolume(data.volume);

        const note = getNearestNote(data.frequency, activeTuning.id === 'half_step_down', notation);
        setNearestNote(note);

        if (isAuto) {
          const closest = findClosestString(data.frequency, activeTuning.strings);
          if (closest) {
            setDetectedString(closest.string);
            const alpha = 0.3;
            smoothedCentsRef.current =
              smoothedCentsRef.current * (1 - alpha) + closest.cents * alpha;
            const smoothed = Number(smoothedCentsRef.current.toFixed(1));
            setCentsDeviation(smoothed);
            setIsInTune(Math.abs(smoothed) <= 3.5);
          }
        } else {
          const targetStr = activeTuning.strings.find(
            (s) => s.stringNumber === selectedStringNum
          );
          if (targetStr) {
            setDetectedString(targetStr);
            const cents = calculateCents(data.frequency, targetStr.frequency);
            const clamped = Math.max(-50, Math.min(50, cents));
            const alpha = 0.3;
            smoothedCentsRef.current =
              smoothedCentsRef.current * (1 - alpha) + clamped * alpha;
            const smoothed = Number(smoothedCentsRef.current.toFixed(1));
            setCentsDeviation(smoothed);
            setIsInTune(Math.abs(smoothed) <= 3.5);
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
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, [activeTuning, isAuto, selectedStringNum, notation]);

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

  // Phát âm thanh mẫu khi bấm vào dây
  const handleStringClick = (str: TunerString) => {
    setSelectedStringNum(str.stringNumber);
    if (!engineRef.current) return;

    setPlayingStringNum(str.stringNumber);
    engineRef.current.playTone(str.frequency);
    setTimeout(() => {
      setPlayingStringNum((prev) => (prev === str.stringNumber ? null : prev));
    }, 2500);
  };

  // Xác định dây đang được active (theo auto hoặc manual)
  const activeString = isAuto
    ? detectedString || activeTuning.strings[0]
    : activeTuning.strings.find((s) => s.stringNumber === selectedStringNum) ||
      activeTuning.strings[0];

  // Tính vị trí kim chỉ / con chạy (từ -45% đến +45% tính từ tâm)
  const puckOffsetPercent = Math.max(-46, Math.min(46, (centsDeviation / 50) * 46));

  // Map dây đàn sang 2 cột trái/phải trên đầu cần đàn (Headstock):
  // Cột trái (từ trên xuống dưới): Dây 4 (D), Dây 5 (A), Dây 6 (E)
  // Cột phải (từ trên xuống dưới): Dây 3 (G), Dây 2 (B), Dây 1 (E)
  const string4 = activeTuning.strings.find((s) => s.stringNumber === 4)!;
  const string5 = activeTuning.strings.find((s) => s.stringNumber === 5)!;
  const string6 = activeTuning.strings.find((s) => s.stringNumber === 6)!;
  const string3 = activeTuning.strings.find((s) => s.stringNumber === 3)!;
  const string2 = activeTuning.strings.find((s) => s.stringNumber === 2)!;
  const string1 = activeTuning.strings.find((s) => s.stringNumber === 1)!;

  // Render nút chốt dây (Peg Button) tròn như GuitarTuna
  const renderPegButton = (str: TunerString | undefined, side: 'left' | 'right') => {
    if (!str) return null;
    const isCurrent =
      activeString && activeString.stringNumber === str.stringNumber;
    const isPlaying = playingStringNum === str.stringNumber;

    return (
      <button
        key={str.stringNumber}
        type="button"
        onClick={() => handleStringClick(str)}
        className={`relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center font-bold transition-all transform active:scale-90 ${
          isCurrent && isInTune
            ? 'bg-emerald-500 text-black shadow-[0_0_24px_rgba(16,185,129,0.8)] scale-105 ring-4 ring-emerald-400/40'
            : isCurrent
            ? 'bg-[#2a3036] text-[#00e5a3] border-2 border-[#00e5a3] shadow-[0_0_18px_rgba(0,229,163,0.5)] scale-105'
            : 'bg-[#23272c] text-white/80 border border-white/10 hover:border-white/30 hover:bg-[#2b3036]'
        }`}
        title={`Dây ${str.stringNumber} (${str.name} - ${str.frequency.toFixed(1)} Hz)`}
      >
        <span className="text-lg sm:text-xl font-extrabold leading-none tracking-tight">
          {str.note}
        </span>
        <span className="text-[10px] text-white/40 mt-0.5 font-medium">
          {str.octave}
        </span>

        {/* Nốt phát âm thanh mẫu icon nhỏ */}
        {isPlaying && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-black">
            <Volume2 className="w-3 h-3 animate-ping" />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-[720px] bg-[#14171a] text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 select-none flex flex-col justify-between relative font-sans">
      {/* 1. TOP HEADER: Logo & Kiểu đàn & Switch AUTO */}
      <div className="p-4 sm:p-5 pb-2 flex items-center justify-between border-b border-white/5 relative z-20">
        <div>
          {/* Logo style guitartuna */}
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
              cún<span className="text-[#00e5a3]">tuna</span>
            </span>
          </div>

          {/* Selector Tuning */}
          <button
            type="button"
            onClick={() => setIsTuningMenuOpen(true)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white mt-0.5 font-medium transition-colors"
          >
            <span>Guitar 6-string</span>
            <span className="text-white/30">•</span>
            <span className="text-[#00e5a3] font-semibold">{activeTuning.name.split('(')[0].trim()}</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-white/40" />
          </button>
        </div>

        {/* Switch AUTO */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-white/70">
            AUTO
          </span>
          <button
            type="button"
            onClick={() => setIsAuto(!isAuto)}
            className={`w-12 h-6 sm:w-13 sm:h-7 rounded-full transition-colors relative p-0.5 ${
              isAuto ? 'bg-[#00e5a3]' : 'bg-[#2b3036]'
            }`}
            aria-label="Chuyển chế độ tự động hoặc thủ công"
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-md transition-transform ${
                isAuto ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. KHU VỰC THƯỚC ĐO CAO ĐỘ (TUNER GAUGE & METER) */}
      <div className="flex-1 flex flex-col justify-center px-4 pt-4 pb-2 relative z-10 overflow-hidden">
        {/* Nền lưới toạ độ mờ đặc trưng GuitarTuna */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Các chấm / sóng âm phản hồi âm lượng (Audio reactive particles) */}
        {isListening && currentVolume > 0.01 && (
          <div className="absolute inset-x-8 top-16 bottom-16 pointer-events-none flex items-center justify-around opacity-40">
            {[0.4, 0.8, 1.2, 0.7, 1.5, 0.9, 0.5].map((scale, i) => (
              <div
                key={i}
                className="w-1 bg-[#ff5252] rounded-full transition-all duration-75"
                style={{
                  height: `${Math.min(60, currentVolume * 250 * scale)}px`,
                  opacity: Math.min(1, currentVolume * 15),
                }}
              />
            ))}
          </div>
        )}

        {/* Ký hiệu Giáng (b) bên trái & Thăng (#) bên phải */}
        <div className="flex items-center justify-between px-6 mb-2 text-2xl font-light text-white/30">
          <span className="font-serif italic">♭</span>
          <span className="font-serif italic">♯</span>
        </div>

        {/* Trục đo ngang & Vạch trung tâm */}
        <div className="relative w-full h-24 flex items-center justify-center">
          {/* Đường tâm dọc màu trắng (Target Center Line) */}
          <div
            className={`absolute top-0 bottom-0 w-[2px] transition-colors duration-200 z-10 ${
              isInTune ? 'bg-[#00e5a3] shadow-[0_0_12px_#00e5a3]' : 'bg-white/20'
            }`}
          />

          {/* Vạch ngang tham chiếu */}
          <div className="w-full h-[1px] bg-white/10" />

          {/* CON CHẠY ĐO CENT (FLOATING PUCK) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-75 ease-out z-20"
            style={{
              left: `${50 + puckOffsetPercent}%`,
            }}
          >
            {/* Vòng tròn rỗng đặc trưng GuitarTuna */}
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-all ${
                isInTune
                  ? 'border-[#00e5a3] bg-[#00e5a3]/20 shadow-[0_0_24px_rgba(0,229,163,0.9)] scale-110'
                  : currentFrequency
                  ? 'border-white bg-[#1a1e22]/90 shadow-lg'
                  : 'border-white/30 bg-[#1a1e22]/60'
              }`}
            >
              {/* Nốt hoặc dấu tích khi chuẩn */}
              {isInTune ? (
                <CheckCircle2 className="w-6 h-6 text-[#00e5a3]" />
              ) : currentFrequency ? (
                <span
                  className={`text-xs font-black ${
                    Math.abs(centsDeviation) > 20
                      ? 'text-[#ff5252]'
                      : 'text-amber-400'
                  }`}
                >
                  {centsDeviation > 0 ? `+${centsDeviation}` : centsDeviation}
                </span>
              ) : (
                <div className="w-2 h-2 rounded-full bg-white/40" />
              )}
            </div>

            {/* Chóp nhọn hướng xuống tâm */}
            <div
              className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] mx-auto mt-0.5 ${
                isInTune ? 'border-t-[#00e5a3]' : 'border-t-white'
              }`}
            />
          </div>
        </div>

        {/* Hướng dẫn căn chỉnh trực quan (Too low / In tune / Too high) */}
        <div className="text-center h-8 flex items-center justify-center">
          {isInTune ? (
            <span className="text-sm font-extrabold text-[#00e5a3] tracking-wider uppercase animate-pulse">
              ✓ Đã chuẩn! (In Tune)
            </span>
          ) : currentFrequency && centsDeviation < -3.5 ? (
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              ▲ Vặn chặt lên (Quá thấp)
            </span>
          ) : currentFrequency && centsDeviation > 3.5 ? (
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              ▼ Nới lỏng ra (Quá cao)
            </span>
          ) : isListening ? (
            <span className="text-xs text-white/40 tracking-wide">
              Gảy một dây để bắt đầu đo...
            </span>
          ) : (
            <span className="text-xs text-white/40 tracking-wide">
              Bật Micro để bắt đầu chỉnh dây
            </span>
          )}
        </div>
      </div>

      {/* 3. KHU VỰC ĐẦU CẦN ĐÀN GUITAR (REALISTIC ACOUSTIC HEADSTOCK) */}
      <div className="relative w-full h-[360px] flex items-center justify-between px-3 sm:px-6 pb-4">
        {/* CỘT PHÍM KHÓA TRÁI (D, A, E) */}
        <div className="flex flex-col justify-around h-full py-4 z-20">
          {renderPegButton(string4, 'left')}
          {renderPegButton(string5, 'left')}
          {renderPegButton(string6, 'left')}
        </div>

        {/* HÌNH ĐẦU CẦN ĐÀN GỖ (SVG HEADSTOCK) */}
        <div className="flex-1 h-full flex items-center justify-center relative z-10 pointer-events-none">
          <svg
            viewBox="0 0 240 340"
            className="w-full max-w-[220px] h-full overflow-visible drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
          >
            <defs>
              {/* Gradient vân gỗ tự nhiên cho đầu đàn */}
              <linearGradient id="woodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7a3d16" />
                <stop offset="25%" stopColor="#9c5423" />
                <stop offset="50%" stopColor="#874419" />
                <stop offset="75%" stopColor="#69300e" />
                <stop offset="100%" stopColor="#4a1e05" />
              </linearGradient>

              {/* Viền kim loại / cẩn ốc xà cừ quanh đầu cần */}
              <linearGradient id="bindingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f7ecd7" />
                <stop offset="50%" stopColor="#ebd3aa" />
                <stop offset="100%" stopColor="#c7a46d" />
              </linearGradient>

              {/* Kim loại bạc của khóa chốt (Chrome post) */}
              <radialGradient id="chromeGradient" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#d8dce2" />
                <stop offset="75%" stopColor="#8d949e" />
                <stop offset="100%" stopColor="#4c5158" />
              </radialGradient>
            </defs>

            {/* Thân cần đàn & phím phía dưới (Fretboard) */}
            <rect x="75" y="275" width="90" height="65" fill="#2b231d" />
            {/* Phím đàn kim loại (Frets) */}
            <line x1="75" y1="315" x2="165" y2="315" stroke="#9da5b0" strokeWidth="2" />
            <circle cx="120" cy="330" r="3" fill="#ebd3aa" opacity="0.8" />

            {/* Lược đàn (Bone Nut) màu ngà trắng */}
            <rect x="74" y="265" width="92" height="12" rx="2" fill="#faf6ee" stroke="#b0a894" strokeWidth="0.8" />

            {/* Thân gỗ Đầu Cần Đàn (Headstock Body) */}
            <path
              d="
                M 75 265
                C 65 210, 50 150, 48 90
                C 46 45, 65 25, 100 32
                C 112 34, 120 40, 120 40
                C 120 40, 128 34, 140 32
                C 175 25, 194 45, 192 90
                C 190 150, 175 210, 165 265
                Z
              "
              fill="url(#woodGradient)"
              stroke="url(#bindingGradient)"
              strokeWidth="3.5"
            />

            {/* Nắp đậy ti chỉnh cần (Truss rod cover hình chuông đen) */}
            <path
              d="M 112 263 C 112 225, 115 220, 120 220 C 125 220, 128 225, 128 263 Z"
              fill="#181818"
              stroke="#444"
              strokeWidth="0.8"
            />
            <circle cx="120" cy="225" r="1.5" fill="#aaa" />

            {/* 6 Khóa kim loại bên trong (Tuning Posts) */}
            {/* Dây 4: Trái Trên */}
            <circle cx="70" cy="95" r="7" fill="url(#chromeGradient)" stroke="#222" strokeWidth="1" />
            {/* Dây 5: Trái Giữa */}
            <circle cx="72" cy="155" r="7" fill="url(#chromeGradient)" stroke="#222" strokeWidth="1" />
            {/* Dây 6: Trái Dưới */}
            <circle cx="76" cy="215" r="7" fill="url(#chromeGradient)" stroke="#222" strokeWidth="1" />

            {/* Dây 3: Phải Trên */}
            <circle cx="170" cy="95" r="7" fill="url(#chromeGradient)" stroke="#222" strokeWidth="1" />
            {/* Dây 2: Phải Giữa */}
            <circle cx="168" cy="155" r="7" fill="url(#chromeGradient)" stroke="#222" strokeWidth="1" />
            {/* Dây 1: Phải Dưới */}
            <circle cx="164" cy="215" r="7" fill="url(#chromeGradient)" stroke="#222" strokeWidth="1" />

            {/* CÁC ĐƯỜNG DÂY ĐÀN (GUITAR STRINGS CHẠY TỪ LƯỢC ĐÀN ĐẾN CHỐT KHÓA) */}
            {/* Dây 6 (E trầm - dày nhất, chạy vào chốt dưới cùng bên trái) */}
            <line
              x1="82"
              y1="340"
              x2="76"
              y2="215"
              stroke={activeString?.stringNumber === 6 ? '#00e5a3' : '#c99f70'}
              strokeWidth={activeString?.stringNumber === 6 ? 3.5 : 2.8}
              className={activeString?.stringNumber === 6 ? 'filter drop-shadow-[0_0_6px_#00e5a3]' : ''}
            />

            {/* Dây 5 (A - chạy vào chốt giữa bên trái) */}
            <line
              x1="97"
              y1="340"
              x2="72"
              y2="155"
              stroke={activeString?.stringNumber === 5 ? '#00e5a3' : '#d1aba0'}
              strokeWidth={activeString?.stringNumber === 5 ? 3 : 2.2}
              className={activeString?.stringNumber === 5 ? 'filter drop-shadow-[0_0_6px_#00e5a3]' : ''}
            />

            {/* Dây 4 (D - chạy vào chốt trên cùng bên trái) */}
            <line
              x1="112"
              y1="340"
              x2="70"
              y2="95"
              stroke={activeString?.stringNumber === 4 ? '#00e5a3' : '#d8dbe0'}
              strokeWidth={activeString?.stringNumber === 4 ? 2.6 : 1.8}
              className={activeString?.stringNumber === 4 ? 'filter drop-shadow-[0_0_6px_#00e5a3]' : ''}
            />

            {/* Dây 3 (G - chạy vào chốt trên cùng bên phải) */}
            <line
              x1="128"
              y1="340"
              x2="170"
              y2="95"
              stroke={activeString?.stringNumber === 3 ? '#00e5a3' : '#d8dbe0'}
              strokeWidth={activeString?.stringNumber === 3 ? 2.4 : 1.5}
              className={activeString?.stringNumber === 3 ? 'filter drop-shadow-[0_0_6px_#00e5a3]' : ''}
            />

            {/* Dây 2 (B - chạy vào chốt giữa bên phải) */}
            <line
              x1="143"
              y1="340"
              x2="168"
              y2="155"
              stroke={activeString?.stringNumber === 2 ? '#00e5a3' : '#e6e8eb'}
              strokeWidth={activeString?.stringNumber === 2 ? 2.2 : 1.2}
              className={activeString?.stringNumber === 2 ? 'filter drop-shadow-[0_0_6px_#00e5a3]' : ''}
            />

            {/* Dây 1 (E bổng - mỏng nhất, chạy vào chốt dưới cùng bên phải) */}
            <line
              x1="158"
              y1="340"
              x2="164"
              y2="215"
              stroke={activeString?.stringNumber === 1 ? '#00e5a3' : '#f0f2f5'}
              strokeWidth={activeString?.stringNumber === 1 ? 2 : 1}
              className={activeString?.stringNumber === 1 ? 'filter drop-shadow-[0_0_6px_#00e5a3]' : ''}
            />
          </svg>
        </div>

        {/* CỘT PHÍM KHÓA PHẢI (G, B, E) */}
        <div className="flex flex-col justify-around h-full py-4 z-20">
          {renderPegButton(string3, 'right')}
          {renderPegButton(string2, 'right')}
          {renderPegButton(string1, 'right')}
        </div>
      </div>

      {/* 4. FOOTER: NÚT BẬT/TẮT MICRO & THÔNG BÁO LỖI */}
      <div className="p-4 bg-[#101215] border-t border-white/5 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            className={`px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-[#00e5a3] text-black font-extrabold hover:bg-[#00c98f] shadow-lg shadow-[#00e5a3]/20'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Tắt Micro</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Bật Micro</span>
              </>
            )}
          </button>

          {/* Vạch âm lượng */}
          {isListening && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00e5a3] transition-all duration-75"
                  style={{ width: `${Math.min(100, currentVolume * 350)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="text-[11px] text-white/40 block">
            {activeString ? `Đang chỉnh Dây ${activeString.stringNumber}: ${activeString.frequency.toFixed(1)}Hz` : ''}
          </span>
        </div>
      </div>

      {/* MODAL / BOTTOM SHEET CHỌN KIỂU TUNING */}
      {isTuningMenuOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end p-4 animate-in fade-in duration-150">
          <div className="bg-[#1c2024] border border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                Chọn Kiểu Lên Dây (Tuning)
              </h3>
              <button
                type="button"
                onClick={() => setIsTuningMenuOpen(false)}
                className="p-1 rounded-full text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {TUNING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setActiveTuning(preset);
                    setIsTuningMenuOpen(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    activeTuning.id === preset.id
                      ? 'bg-[#00e5a3]/15 border-[#00e5a3] text-white'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/80'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm">{preset.name}</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      {preset.description}
                    </div>
                  </div>
                  {activeTuning.id === preset.id && (
                    <CheckCircle2 className="w-5 h-5 text-[#00e5a3]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POPUP THÔNG BÁO LỖI MICRO NẾU BỊ TỪ CHỐI */}
      {error && (
        <div className="absolute top-16 inset-x-4 bg-rose-950/90 border border-rose-500/50 p-4 rounded-2xl z-40 text-xs text-rose-200 shadow-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-white mb-0.5">{error.message}</p>
            <p className="text-rose-300">
              Vui lòng bấm vào biểu tượng ổ khóa bên trái thanh địa chỉ trên trình duyệt để cấp quyền micro, sau đó thử lại.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
