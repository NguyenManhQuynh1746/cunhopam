'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { transposeChord } from '@/lib/chords/transpose';
import { playFretPositions } from '@/lib/chords/audio';
import ChordDiagramSvg, { ChordPositionProps } from './ChordDiagramSvg';
import SongItem, { SongItemData } from '@/components/song/SongItem';
import { Volume2, ArrowLeft } from 'lucide-react';

interface ChordDetailViewerProps {
  chordName: string;
  guitarPositions: ChordPositionProps[];
  ukulelePositions: ChordPositionProps[];
  notes: string[];
  songs: SongItemData[];
}

export default function ChordDetailViewer({
  chordName,
  guitarPositions,
  ukulelePositions,
  notes,
  songs,
}: ChordDetailViewerProps) {
  const { notation, toggleNotation } = useApp();
  const [instrument, setInstrument] = useState<'guitar' | 'ukulele'>('guitar');
  const [activeFretIdx, setActiveFretIdx] = useState(0);

  // Lưu và khôi phục sở thích nhạc cụ từ localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cunhopam_instrument') as 'guitar' | 'ukulele';
      if (saved) setInstrument(saved);
    }
  }, []);

  const handleInstrumentChange = (inst: 'guitar' | 'ukulele') => {
    setInstrument(inst);
    setActiveFretIdx(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cunhopam_instrument', inst);
    }
  };

  const positions = instrument === 'guitar' ? guitarPositions : ukulelePositions;
  const currentPos = positions[activeFretIdx] || positions[0];
  const displayName = transposeChord(chordName, 0, notation);

  const handlePlaySound = (pos: ChordPositionProps) => {
    if (pos && pos.frets) {
      playFretPositions(pos.frets, instrument);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Nút quay lại & Header */}
      <div className="space-y-4">
        <Link
          href="/hop-am"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-accent transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Thư viện hợp âm</span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl sm:text-5xl font-black text-ink">
                {displayName}
              </h1>
              {notation === 'vi' && (
                <span className="text-sm font-mono text-muted">({chordName})</span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Thế bấm {instrument === 'guitar' ? 'Guitar' : 'Ukulele'} •{' '}
              {positions.length} cách bấm khác nhau
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Công tắc chọn Guitar / Ukulele */}
            <div className="flex items-center bg-surface p-1 rounded-2xl border border-line text-xs font-bold shadow-xs">
              <button
                onClick={() => handleInstrumentChange('guitar')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  instrument === 'guitar'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Guitar (6 dây)
              </button>
              <button
                onClick={() => handleInstrumentChange('ukulele')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  instrument === 'ukulele'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Ukulele (4 dây)
              </button>
            </div>

            <button
              onClick={toggleNotation}
              className="px-3 py-1.5 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:border-accent transition shrink-0"
            >
              {notation === 'vi' ? '🇻🇳 Đô Rê Mi' : '🇺🇸 C D E'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Thế bấm chính & Nốt cấu thành */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Thế bấm tiêu biểu nổi bật */}
        <div className="md:col-span-2 rounded-3xl border border-line bg-surface p-6 space-y-4 shadow-sm text-center">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <span className="text-xs font-bold text-muted uppercase">
              Thế bấm {activeFretIdx + 1} / {positions.length}
            </span>
            <button
              onClick={() => handlePlaySound(currentPos)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-bold hover:bg-accent-dark transition shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Nghe thử thế này</span>
            </button>
          </div>

          <div className="flex justify-center py-2">
            {currentPos ? (
              <ChordDiagramSvg
                chordName={displayName}
                position={currentPos}
                instrument={instrument}
                className="w-56 h-64"
              />
            ) : (
              <p className="text-xs text-muted py-12">Chưa có thế bấm cho nhạc cụ này.</p>
            )}
          </div>

          {/* Chọn nhanh thế bấm */}
          {positions.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-line">
              {positions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveFretIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeFretIdx === idx
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-bg text-muted hover:text-ink border border-line'
                  }`}
                >
                  Thế {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thông tin nốt cấu thành hợp âm */}
        <div className="rounded-3xl border border-line bg-surface p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-ink uppercase tracking-wider">
              Nốt cấu thành
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Các cao độ tạo nên hợp âm {chordName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {notes.map((note, idx) => (
              <div
                key={idx}
                className="w-12 h-12 rounded-2xl bg-bg border border-line font-black text-base text-accent flex items-center justify-center shadow-xs"
              >
                {note}
              </div>
            ))}
          </div>

          <div className="pt-2 text-xs text-muted leading-relaxed">
            Hợp âm <strong className="text-ink">{displayName}</strong> được tạo bởi các nốt{' '}
            <strong className="text-accent">{notes.join(' - ')}</strong>. Các nốt này được bấm hoặc gảy buông trên các dây đàn tương ứng.
          </div>
        </div>
      </div>

      {/* Tất cả các thế bấm (Gallery View) */}
      {positions.length > 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-ink">
            Tất cả các thế bấm {instrument === 'guitar' ? 'Guitar' : 'Ukulele'} của {displayName}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {positions.map((pos, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-4 bg-surface text-center space-y-2 transition cursor-pointer hover:border-accent ${
                  activeFretIdx === idx ? 'border-accent ring-2 ring-accent/20' : 'border-line'
                }`}
                onClick={() => {
                  setActiveFretIdx(idx);
                  handlePlaySound(pos);
                }}
              >
                <div className="text-xs font-bold text-muted">Thế {idx + 1}</div>
                <div className="flex justify-center">
                  <ChordDiagramSvg
                    position={pos}
                    instrument={instrument}
                    className="w-36 h-44"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySound(pos);
                  }}
                  className="w-full py-1 rounded-lg bg-bg hover:bg-accent hover:text-white border border-line text-[11px] font-bold transition flex items-center justify-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Nghe</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Các bài hát có sử dụng hợp âm này */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">
            Bài hát có hợp âm {displayName} ({songs.length})
          </h2>
        </div>

        {songs.length === 0 ? (
          <div className="p-8 rounded-3xl border border-line bg-surface text-center text-xs text-muted">
            Chưa có bài hát nào trong thư viện sử dụng hợp âm này.
          </div>
        ) : (
          <div className="space-y-3">
            {songs.map((song, i) => (
              <SongItem key={song.id} song={song} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

