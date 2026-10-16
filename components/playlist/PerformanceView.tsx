'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseChordLyrics, RenderedLine } from '@/lib/chordpro/renderer';
import { transposeChord, transposeLyrics } from '@/lib/chords/transpose';
import { useApp } from '@/context/AppContext';
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  X,
  ListMusic,
  SunMedium,
} from 'lucide-react';

export interface PerformanceSong {
  id: string;
  title: string;
  slug: string;
  key: string;
  content: string;
  artist_name?: string | null;
}

interface PerformanceViewProps {
  songs: PerformanceSong[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function PerformanceView({
  songs,
  initialIndex = 0,
  isOpen,
  onClose,
}: PerformanceViewProps) {
  const { notation } = useApp();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fontSize, setFontSize] = useState(22); // Chữ lớn mặc định cho biểu diễn
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [showSongList, setShowSongList] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAccumulator = useRef(0);
  const animFrameId = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  const currentSong = songs[currentIndex] || songs[0];

  // 1. Quản lý Screen Wake Lock (giữ màn hình luôn sáng khi đang biểu diễn)
  useEffect(() => {
    if (!isOpen) return;

    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          const wl = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current = wl;
          setWakeLockActive(true);
          wl.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          console.warn('Wake Lock không khả dụng hoặc bị từ chối:', err);
        }
      }
    }

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isOpen]);

  // 2. Chuyển đổi Fullscreen API (kèm fallback overlay cho iPhone Safari)
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch {
      // Fallback CSS fixed overlay đã đảm nhiệm hiển thị toàn màn hình
      setIsFullscreen((prev) => !prev);
    }
  };

  // 3. Tự cuộn Auto-scroll
  useEffect(() => {
    if (!isScrolling) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const pxPerSec = scrollSpeed === 1 ? 25 : scrollSpeed === 2 ? 45 : scrollSpeed === 3 ? 75 : 110;
      scrollAccumulator.current += pxPerSec * dt;

      if (scrollAccumulator.current >= 1 && containerRef.current) {
        const step = Math.floor(scrollAccumulator.current);
        scrollAccumulator.current -= step;
        containerRef.current.scrollBy({ top: step, behavior: 'instant' as ScrollBehavior });

        // Dừng khi chạm đáy
        if (
          containerRef.current.scrollTop + containerRef.current.clientHeight >=
          containerRef.current.scrollHeight - 5
        ) {
          setIsScrolling(false);
          return;
        }
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isScrolling, scrollSpeed]);

  // Render các dòng của bài hát hiện tại
  const renderedLines: RenderedLine[] = useMemo(() => {
    if (!currentSong) return [];
    return parseChordLyrics(currentSong.content);
  }, [currentSong]);

  if (!isOpen || !currentSong) return null;

  const handlePrev = () => {
    setIsScrolling(false);
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  const handleNext = () => {
    setIsScrolling(false);
    if (currentIndex < songs.length - 1) setCurrentIndex((prev) => prev + 1);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-bg text-ink flex flex-col justify-between overflow-y-auto select-text font-sans"
    >
      {/* 1. Header Điều khiển Biểu diễn */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-line px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 truncate">
          <button
            onClick={() => setShowSongList(!showSongList)}
            className="p-2 rounded-xl bg-bg border border-line text-ink hover:border-accent transition flex items-center gap-1.5 text-xs font-bold"
            title="Danh sách bài trong playlist"
          >
            <ListMusic className="w-4 h-4 text-accent" />
            <span>
              {currentIndex + 1} / {songs.length}
            </span>
          </button>

          <div className="truncate">
            <h2 className="font-extrabold text-base sm:text-lg text-ink truncate leading-tight">
              {currentSong.title}
            </h2>
            <div className="text-xs text-muted truncate">
              {currentSong.artist_name || 'Truyền thống'} • Tông:{' '}
              <span className="font-mono font-bold text-accent">{currentSong.key}</span>
            </div>
          </div>
        </div>

        {/* Nhóm nút công cụ: Chữ, Cuộn, Màn hình sáng, Thoát */}
        <div className="flex items-center gap-2">
          {wakeLockActive && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30"
              title="Màn hình đang được giữ luôn sáng"
            >
              <SunMedium className="w-3.5 h-3.5" />
              <span>Sáng màn hình</span>
            </span>
          )}

          {/* Phóng to / Thu nhỏ chữ */}
          <div className="hidden sm:flex items-center gap-1 bg-bg px-2 py-1 rounded-xl border border-line">
            <button
              onClick={() => setFontSize((p) => Math.max(16, p - 2))}
              className="p-1 text-muted hover:text-ink transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-1">{fontSize}px</span>
            <button
              onClick={() => setFontSize((p) => Math.min(36, p + 2))}
              className="p-1 text-muted hover:text-ink transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Nút Toàn màn hình */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-bg border border-line text-muted hover:text-ink transition hidden sm:inline-flex"
            title="Chuyển toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Nút Thoát */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 hover:bg-rose-500 hover:text-white transition"
            title="Thoát chế độ biểu diễn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Menu danh sách bài hát nhanh dạng Drawer/Drop */}
      {showSongList && (
        <div className="sticky top-16 z-20 mx-4 sm:mx-6 p-4 rounded-2xl bg-surface border border-line shadow-2xl space-y-2 max-h-60 overflow-y-auto">
          <div className="text-xs font-bold text-muted uppercase">Danh sách bài trong Playlist</div>
          <div className="space-y-1">
            {songs.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowSongList(false);
                  if (containerRef.current) containerRef.current.scrollTop = 0;
                }}
                className={`w-full p-2.5 rounded-xl text-left text-sm flex items-center justify-between transition ${
                  idx === currentIndex
                    ? 'bg-accent text-white font-bold'
                    : 'hover:bg-soft text-ink'
                }`}
              >
                <span>
                  {idx + 1}. {s.title}
                </span>
                <span className="text-xs font-mono opacity-80">{s.key}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Nội dung lời và hợp âm (Chord Sheet) chữ lớn */}
      <div className="flex-1 p-6 sm:p-12 max-w-4xl mx-auto w-full" style={{ fontSize: `${fontSize}px` }}>
        <div className="space-y-4">
          {renderedLines.map((line, lIdx) => {
            if (line.type === 'empty') return <div key={lIdx} className="h-6" />;
            if (line.type === 'comment') {
              return (
                <div key={lIdx} className="font-bold text-sm text-accent uppercase tracking-wider py-1">
                  [{line.comment}]
                </div>
              );
            }
            return (
              <div key={lIdx} className="flex flex-wrap items-end leading-none py-1">
                {line.segments?.map((seg, sIdx) => (
                  <span key={sIdx} className="inline-flex flex-col items-start pr-1">
                    {seg.chord ? (
                      <span className="font-bold text-accent text-[0.88em] leading-tight pb-1 font-mono select-none">
                        {seg.chord}
                      </span>
                    ) : (
                      <span className="h-[1.1em] leading-tight select-none opacity-0">&nbsp;</span>
                    )}
                    <span className="text-ink whitespace-pre font-normal leading-normal">
                      {seg.text || ' '}
                    </span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Thanh điều hướng Biểu diễn ở đáy màn hình */}
      <div className="sticky bottom-0 z-20 bg-surface/95 backdrop-blur-md border-t border-line px-4 sm:px-8 py-3 flex items-center justify-between gap-3 shadow-lg">
        {/* Nút Bài trước */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-line bg-bg text-ink text-sm font-bold hover:border-accent transition disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Bài trước</span>
        </button>

        {/* Nút Tự cuộn */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScrolling(!isScrolling)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-md transition ${
              isScrolling
                ? 'bg-emerald-600 text-white'
                : 'bg-accent text-white hover:bg-accent-dark'
            }`}
          >
            {isScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isScrolling ? 'Dừng' : 'Tự cuộn'}</span>
          </button>

          {isScrolling && (
            <div className="hidden sm:flex items-center gap-1 text-xs font-mono bg-bg px-2 py-1 rounded-xl border border-line">
              {[1, 2, 3, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setScrollSpeed(spd)}
                  className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                    scrollSpeed === spd ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nút Bài tiếp theo */}
        <button
          onClick={handleNext}
          disabled={currentIndex === songs.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-line bg-bg text-ink text-sm font-bold hover:border-accent transition disabled:opacity-40"
        >
          <span className="hidden sm:inline">Bài tiếp theo</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

