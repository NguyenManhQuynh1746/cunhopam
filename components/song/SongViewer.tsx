'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { useApp } from '@/context/AppContext';
import { parseChordLyrics, RenderedLine } from '@/lib/chordpro/renderer';
import { transposeChord, transposeLyrics } from '@/lib/chords/transpose';
import ChordPopup from './ChordPopup';
import FavoriteButton from './FavoriteButton';
import CommentSection, { CommentItem } from './CommentSection';
import ReportModal from './ReportModal';
import { suggestCapo } from '@/lib/chords/easy';
import {
  Printer,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Flag,
  Columns,
  Square,
  ShieldCheck,
  ExternalLink,
  FoldVertical,
  Sparkles,
} from 'lucide-react';

export interface SongDetailData {
  id: string;
  title: string;
  slug: string;
  key: string;
  content: string;
  chords: string[];
  license_type: string;
  rights_holder?: string | null;
  source_url?: string | null;
  license_note?: string | null;
  view_count: number;
  created_at: string;
  published_at?: string;
  artist_name?: string | null;
  artist_slug?: string | null;
  rhythm_name?: string | null;
  rhythm_slug?: string | null;
  genre_name?: string | null;
  genre_slug?: string | null;
}

interface SongViewerProps {
  song: SongDetailData;
  preloadedChords: Record<string, any[]>;
  user: User | null;
  initialIsFavorited: boolean;
  initialComments: CommentItem[];
}

export default function SongViewer({
  song,
  preloadedChords,
  user,
  initialIsFavorited,
  initialComments,
}: SongViewerProps) {
  const { notation } = useApp();

  // 1. Tông nhạc (Transpose semitones: -11 đến +11)
  const [transpose, setTranspose] = useState(0);

  // 2. Kích thước chữ
  const [fontSize, setFontSize] = useState(16);

  // 3. Số cột hiển thị (1 hoặc 2)
  const [columns, setColumns] = useState<1 | 2>(1);

  // Chế độ gộp dòng: hiển thị hợp âm ngay trong dòng lời (Inline mode)
  const [isInlineMode, setIsInlineMode] = useState(false);

  // Chế độ Hợp âm dễ & Gợi ý kẹp Capo
  const [isEasyMode, setIsEasyMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cunhopam_inline_mode');
      if (saved === 'true') setIsInlineMode(true);
    }
  }, []);

  const toggleInlineMode = () => {
    setIsInlineMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('cunhopam_inline_mode', String(next));
      }
      return next;
    });
  };

  // 4. Tự cuộn (Auto-scroll với requestAnimationFrame và fractional accumulator)
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2); // 1, 2, 3, 4
  const scrollAccumulator = useRef(0);
  const animFrameId = useRef<number | null>(null);

  // 5. Popup xem hợp âm
  const [activeChord, setActiveChord] = useState<string | null>(null);

  // 6. Modal báo lỗi / khiếu nại
  const [isReportOpen, setIsReportOpen] = useState(false);

  // 7. Ghi nhận lượt xem 1 lần duy nhất (React Strict Mode & Session deduping)
  const hasRecordedView = useRef(false);
  useEffect(() => {
    if (hasRecordedView.current) return;
    hasRecordedView.current = true;

    // Kiểm tra sessionStorage để tránh gọi trùng khi React Strict Mode remount hoặc chuyển tab
    const sessionKey = `viewed_song_${song.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      return;
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(sessionKey, '1');
    }

    fetch(`/api/songs/${song.id}/view`, {
      method: 'POST',
    }).catch((err) => console.error('Lỗi ghi lượt xem:', err));
  }, [song.id]);

  // 8. Tự cuộn với requestAnimationFrame
  useEffect(() => {
    if (!isScrolling) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Tốc độ: speed 1 = 20px/s, speed 2 = 40px/s, speed 3 = 65px/s, speed 4 = 100px/s
      const pxPerSec = scrollSpeed === 1 ? 20 : scrollSpeed === 2 ? 40 : scrollSpeed === 3 ? 65 : 100;
      scrollAccumulator.current += pxPerSec * dt;

      if (scrollAccumulator.current >= 1) {
        const step = Math.floor(scrollAccumulator.current);
        scrollAccumulator.current -= step;
        window.scrollBy({ top: step, behavior: 'instant' as ScrollBehavior });

        // Dừng khi đã cuộn chạm đáy trang
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
          setIsScrolling(false);
          return;
        }
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    // Lắng nghe người dùng cuộn hoặc chạm để tạm dừng tự cuộn
    const handleUserInterrupt = () => {
      setIsScrolling(false);
    };

    window.addEventListener('wheel', handleUserInterrupt, { passive: true });
    window.addEventListener('touchstart', handleUserInterrupt, { passive: true });

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('wheel', handleUserInterrupt);
      window.removeEventListener('touchstart', handleUserInterrupt);
    };
  }, [isScrolling, scrollSpeed]);

  // 9. Tính toán các hợp âm sau khi đổi tông & Gợi ý hợp âm dễ (Capo)
  const originalKey = song.key || 'C';
  const currentKeyName = useMemo(() => {
    return transposeChord(originalKey, transpose, notation);
  }, [originalKey, transpose, notation]);

  // Danh sách hợp âm hiện tại ở tông đang hiển thị (dùng tiếng Anh để phân tích thế bấm mở)
  const currentChordsEn = useMemo(() => {
    return (song.chords || []).map((c) => transposeChord(c, transpose, 'en'));
  }, [song.chords, transpose]);

  // Gợi ý kẹp Capo để có hợp âm dễ bấm nhất (Capo 0 - 5)
  const capoSuggestion = useMemo(() => {
    return suggestCapo(currentChordsEn, transposeChord(originalKey, transpose, 'en'));
  }, [currentChordsEn, originalKey, transpose]);

  // Độ dịch tông thực tế: nếu bật chế độ hợp âm dễ và có Capo > 0, thế bấm hạ tương ứng capoFret
  const effectiveTranspose = useMemo(() => {
    if (isEasyMode && capoSuggestion && capoSuggestion.capoFret > 0) {
      return transpose - capoSuggestion.capoFret;
    }
    return transpose;
  }, [isEasyMode, capoSuggestion, transpose]);

  // Tên giọng thế bấm hiển thị
  const effectiveKeyName = useMemo(() => {
    return transposeChord(originalKey, effectiveTranspose, notation);
  }, [originalKey, effectiveTranspose, notation]);

  // Đổi tông toàn bộ nội dung bài hát theo effectiveTranspose
  const transposedContent = useMemo(() => {
    if (effectiveTranspose === 0 && notation === 'en') return song.content;
    return transposeLyrics(song.content, effectiveTranspose, notation, originalKey);
  }, [song.content, effectiveTranspose, notation, originalKey]);

  // Phân tích thành các dòng hiển thị hợp âm nằm trên lời
  const renderedLines: RenderedLine[] = useMemo(() => {
    return parseChordLyrics(transposedContent);
  }, [transposedContent]);

  // Danh sách các hợp âm độc nhất hiện có trong bài đã đổi tông
  const songChordsList = useMemo(() => {
    return (song.chords || []).map((c) => transposeChord(c, effectiveTranspose, notation));
  }, [song.chords, effectiveTranspose, notation]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header chi tiết bài hát */}
      <section className="print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-line">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-ink tracking-tight">
              {song.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs sm:text-sm text-muted">
              <span>
                Nghệ sĩ:{' '}
                <strong className="text-ink">
                  {song.artist_name || 'Truyền thống'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Tông gốc: <strong className="text-ink font-mono">{song.key || 'C'}</strong>
              </span>
              {song.rhythm_name && (
                <>
                  <span>•</span>
                  <span>
                    Điệu:{' '}
                    <span className="font-semibold text-accent">
                      {song.rhythm_name}
                    </span>
                  </span>
                </>
              )}
              {song.genre_name && (
                <>
                  <span>•</span>
                  <span>
                    Thể loại: <span className="font-medium text-ink">{song.genre_name}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FavoriteButton
              songId={song.id}
              initialIsFavorited={initialIsFavorited}
              user={user}
              songSlug={song.slug}
            />

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border border-line bg-surface text-ink hover:bg-soft transition"
              title="In bài hát hoặc xuất ra PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In / PDF</span>
            </button>
          </div>
        </div>

        {/* Thanh công cụ điều khiển (Sticky Floating Toolbar) */}
        <div className="sticky top-16 z-20 bg-surface/95 backdrop-blur-md border border-line rounded-2xl p-2.5 sm:p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
          {/* Nhóm Đổi Tông (Transpose) */}
          <div className="flex items-center gap-1.5 bg-bg px-2.5 py-1 rounded-xl border border-line">
            <span className="text-xs font-semibold text-muted mr-1">Tông:</span>
            <button
              onClick={() => setTranspose((prev) => prev - 1)}
              className="w-7 h-7 rounded-lg bg-surface border border-line text-sm font-bold text-ink hover:border-accent transition flex items-center justify-center active:scale-95"
              aria-label="Giảm 1 bán âm"
            >
              −
            </button>
            <span className="px-2 font-mono font-bold text-xs sm:text-sm text-accent min-w-[3.5rem] text-center">
              {currentKeyName}
              {transpose !== 0 && (
                <span className="text-[10px] text-muted ml-1">
                  ({transpose > 0 ? `+${transpose}` : transpose})
                </span>
              )}
            </span>
            <button
              onClick={() => setTranspose((prev) => prev + 1)}
              className="w-7 h-7 rounded-lg bg-surface border border-line text-sm font-bold text-ink hover:border-accent transition flex items-center justify-center active:scale-95"
              aria-label="Tăng 1 bán âm"
            >
              +
            </button>
            {transpose !== 0 && (
              <button
                onClick={() => setTranspose(0)}
                className="ml-1 p-1 text-muted hover:text-accent transition"
                title="Về tông gốc"
                aria-label="Khôi phục tông gốc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nhóm Cỡ Chữ & Bố cục 1 hoặc 2 Cột */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-bg px-2 py-1 rounded-xl border border-line">
              <button
                onClick={() => setFontSize((prev) => Math.max(12, prev - 2))}
                className="w-7 h-7 rounded-lg bg-surface border border-line text-xs font-bold text-ink hover:border-accent transition flex items-center justify-center"
                title="Thu nhỏ chữ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-semibold px-1 text-muted">
                {fontSize}px
              </span>
              <button
                onClick={() => setFontSize((prev) => Math.min(26, prev + 2))}
                className="w-7 h-7 rounded-lg bg-surface border border-line text-xs font-bold text-ink hover:border-accent transition flex items-center justify-center"
                title="Phóng to chữ"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Nút Gộp dòng (Inline) / Tách dòng */}
            <button
              onClick={toggleInlineMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isInlineMode
                  ? 'bg-accent text-white border-accent shadow-xs'
                  : 'bg-bg border-line text-ink hover:border-accent'
              }`}
              title={
                isInlineMode
                  ? 'Chuyển sang chế độ tách dòng (hợp âm nằm trên lời)'
                  : 'Gộp hợp âm vào cùng một dòng với lời bài hát'
              }
              aria-pressed={isInlineMode}
            >
              <FoldVertical className="w-3.5 h-3.5" />
              <span>{isInlineMode ? 'Tách dòng' : 'Gộp dòng'}</span>
            </button>

            <button
              onClick={() => setColumns((prev) => (prev === 1 ? 2 : 1))}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-line bg-bg text-xs font-semibold text-ink hover:border-accent transition"
              title="Chuyển chế độ 1 cột / 2 cột"
            >
              {columns === 1 ? <Columns className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>{columns === 1 ? '2 cột' : '1 cột'}</span>
            </button>

            {/* Nút Hợp âm dễ (Gợi ý Capo) */}
            <button
              onClick={() => setIsEasyMode((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isEasyMode
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-bg border-line text-ink hover:border-accent'
              }`}
              title={
                isEasyMode
                  ? 'Tắt gợi ý hợp âm dễ để về thế bấm gốc'
                  : 'Gợi ý vị trí kẹp Capo và thế bấm hợp âm mở dễ chơi'
              }
              aria-pressed={isEasyMode}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEasyMode ? 'Hợp âm dễ: Bật' : 'Hợp âm dễ'}</span>
            </button>
          </div>

          {/* Nhóm Tự Cuộn (Auto Scroll) */}
          <div className="flex items-center gap-2 bg-bg px-2.5 py-1 rounded-xl border border-line ml-auto sm:ml-0">
            <button
              onClick={() => setIsScrolling(!isScrolling)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                isScrolling
                  ? 'bg-emerald-600 text-white'
                  : 'bg-surface border border-line text-ink hover:border-accent'
              }`}
            >
              {isScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isScrolling ? 'Dừng cuộn' : 'Tự cuộn'}</span>
            </button>

            {isScrolling && (
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <span className="text-muted">Tốc độ:</span>
                {[1, 2, 3, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setScrollSpeed(spd)}
                    className={`w-5 h-5 rounded flex items-center justify-center font-bold ${
                      scrollSpeed === spd
                        ? 'bg-accent text-white'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Banner Gợi ý Hợp âm dễ & Capo */}
        {isEasyMode && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in duration-200">
            <div className="flex items-start sm:items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
              {capoSuggestion && capoSuggestion.capoFret > 0 ? (
                <div>
                  <span className="font-bold text-ink">Gợi ý Capo {capoSuggestion.capoFret}:</span>{' '}
                  <span className="text-muted">
                    Kẹp Capo ngăn <strong className="text-ink">{capoSuggestion.capoFret}</strong> và bấm theo thế giọng{' '}
                    <strong className="text-accent">{effectiveKeyName}</strong>. Âm vang thực tế tương đương tông{' '}
                    <strong className="text-ink">{currentKeyName}</strong>.
                  </span>
                </div>
              ) : (
                <div className="text-muted">
                  <span className="font-bold text-ink">Hợp âm cơ bản:</span> Bài hát ở tông này đã gồm các thế bấm mở rất dễ chơi, không cần dùng Capo.
                </div>
              )}
            </div>
            {capoSuggestion && capoSuggestion.capoFret > 0 && (
              <button
                onClick={() => setIsEasyMode(false)}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface border border-line text-muted hover:text-ink hover:border-accent transition shrink-0"
              >
                Về hợp âm gốc
              </button>
            )}
          </div>
        )}

        {/* Danh sách các hợp âm trong bài (Click để mở sơ đồ thế bấm) */}
        {songChordsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-muted">Hợp âm:</span>
            {songChordsList.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => setActiveChord(ch)}
                className="px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-accent hover:text-accent font-bold text-xs sm:text-sm text-ink transition shadow-xs flex items-center gap-1 active:scale-95"
              >
                <span>{ch}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 2. Tiêu đề in ấn đặc thù (Chỉ hiển thị khi Print / PDF) */}
      <div className="hidden print:block pb-4 border-b border-black text-black">
        <h1 className="text-2xl font-bold">{song.title}</h1>
        <div className="text-xs mt-1">
          Nghệ sĩ: {song.artist_name || 'Truyền thống'} | Tông: {currentKeyName}
          {isEasyMode && capoSuggestion && capoSuggestion.capoFret > 0
            ? ` (Kẹp Capo ngăn ${capoSuggestion.capoFret} - bấm thế giọng ${effectiveKeyName})`
            : ''} | Điệu: {song.rhythm_name || 'Ballad'} | Nguồn: cunhopam.com
        </div>
      </div>

      {/* 3. Phần lời và hợp âm (Chord Sheet) */}
      <div
        className={`rounded-3xl border border-line bg-surface p-5 sm:p-8 shadow-sm transition-all select-text font-sans ${
          columns === 2 ? 'md:columns-2 gap-10 [column-fill:_auto]' : ''
        } print:border-none print:p-0 print:text-black print:columns-1`}
        style={{ fontSize: `${fontSize}px` }}
      >
        <div className="space-y-4">
          {renderedLines.map((line, lIdx) => {
            if (line.type === 'empty') {
              return <div key={lIdx} className="h-4" />;
            }

            if (line.type === 'comment') {
              return (
                <div
                  key={lIdx}
                  className="font-semibold text-xs sm:text-sm text-accent dark:text-pick py-1 uppercase tracking-wider"
                >
                  [{line.comment}]
                </div>
              );
            }

            // 1. Chế độ Gộp dòng (Hợp âm gắn liền trong dòng lời)
            if (isInlineMode) {
              return (
                <div
                  key={lIdx}
                  className="leading-loose py-0.5 break-inside-avoid text-ink"
                >
                  {line.segments?.map((seg, sIdx) => {
                    return (
                      <span key={sIdx} className="inline">
                        {seg.chord && (
                          <button
                            type="button"
                            onClick={() => setActiveChord(seg.chord!)}
                            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-accent dark:text-pick bg-accent/10 dark:bg-accent/20 hover:bg-accent hover:text-white transition-colors text-[0.88em] font-mono leading-none align-baseline cursor-pointer select-none print:text-black print:border print:border-black"
                            title={`Bấm xem thế bấm của hợp âm ${seg.chord}`}
                          >
                            [{seg.chord}]
                          </button>
                        )}
                        <span className="whitespace-pre font-normal print:text-black">
                          {seg.text}
                        </span>
                      </span>
                    );
                  })}
                </div>
              );
            }

            // 2. Chế độ Tách dòng (Hợp âm nằm trên lời bài hát - mặc định)
            return (
              <div
                key={lIdx}
                className="flex flex-wrap items-end leading-none py-1 break-inside-avoid"
              >
                {line.segments?.map((seg, sIdx) => {
                  return (
                    <span
                      key={sIdx}
                      className="inline-flex flex-col items-start pr-0.5 relative group"
                    >
                      {seg.chord ? (
                        <button
                          type="button"
                          onClick={() => setActiveChord(seg.chord!)}
                          className="font-bold text-accent dark:text-pick hover:underline cursor-pointer pb-1 text-[0.88em] leading-tight select-none print:text-black"
                          title={`Bấm xem thế bấm của hợp âm ${seg.chord}`}
                        >
                          {seg.chord}
                        </button>
                      ) : (
                        <span className="h-[1.2em] leading-tight select-none opacity-0">
                          &nbsp;
                        </span>
                      )}
                      <span className="text-ink whitespace-pre font-normal leading-normal print:text-black">
                        {seg.text || ' '}
                      </span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Thông tin giấy phép bản quyền & Nút Báo lỗi */}
      <section className="print:hidden rounded-2xl border border-line bg-bg p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              Giấy phép:{' '}
              {song.license_type === 'public_domain'
                ? 'Thuộc phạm vi công cộng (Public Domain)'
                : song.license_type === 'creative_commons'
                ? 'Creative Commons (CC BY-SA)'
                : song.license_type}
            </span>
          </div>
          {song.rights_holder && (
            <div>Chủ sở hữu / Nguồn gốc: <strong className="text-ink">{song.rights_holder}</strong></div>
          )}
          {song.source_url && (
            <div>
              <a
                href={song.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent hover:underline inline-flex items-center gap-1"
              >
                <span>Xem tư liệu nguồn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsReportOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface text-muted hover:text-rose-600 hover:border-rose-300 transition text-xs font-semibold"
        >
          <Flag className="w-3.5 h-3.5 text-rose-500" />
          <span>Báo lỗi / Khiếu nại bản quyền</span>
        </button>
      </section>

      {/* 5. Khu vực bình luận */}
      <div className="print:hidden">
        <CommentSection
          songId={song.id}
          initialComments={initialComments}
          user={user}
          songSlug={song.slug}
        />
      </div>

      {/* 6. Popup xem thế bấm hợp âm & nghe tiếng đàn Web Audio */}
      {activeChord && (
        <ChordPopup
          chordName={activeChord}
          isOpen={!!activeChord}
          onClose={() => setActiveChord(null)}
          notation={notation}
          dbPositions={preloadedChords[activeChord] || null}
        />
      )}

      {/* 7. Modal Báo lỗi & Khiếu nại bản quyền */}
      <ReportModal
        songId={song.id}
        songTitle={song.title}
        user={user}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
}

