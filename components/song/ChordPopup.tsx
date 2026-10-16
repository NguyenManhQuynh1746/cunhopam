'use client';

import { useState, useEffect } from 'react';
import { getAllChordPositions, renderChordSvg } from '@/lib/chords/diagram';
import { playFretPositions } from '@/lib/chords/audio';
import { transposeChord } from '@/lib/chords/transpose';
import { Volume2, X } from 'lucide-react';

interface DbChordPosition {
  frets: number[];
  fingers?: number[];
  barres?: number[];
  baseFret?: number;
}

interface ChordPopupProps {
  chordName: string;
  isOpen: boolean;
  onClose: () => void;
  notation: 'en' | 'vi';
  dbPositions?: DbChordPosition[] | null;
}

export default function ChordPopup({
  chordName,
  isOpen,
  onClose,
  notation,
  dbPositions,
}: ChordPopupProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Reset về vị trí đầu tiên khi đổi hợp âm
  useEffect(() => {
    setSelectedIdx(0);
  }, [chordName]);

  if (!isOpen || !chordName) return null;

  // Lấy các thế bấm: Ưu tiên từ DB đã preload, nếu không có thì fallback sang thuật toán lib/chords
  let positions = getAllChordPositions(chordName);

  if (dbPositions && dbPositions.length > 0) {
    // Chuyển format DB sang format diagram
    positions = dbPositions.map((p, idx) => {
      const positiveFrets = p.frets.filter((x) => x > 0);
      const minFret = positiveFrets.length > 0 ? Math.min(...positiveFrets) : 1;
      const baseFret = p.baseFret || (Math.max(...positiveFrets, 0) <= 5 ? 1 : minFret);
      const barreFret = p.barres && p.barres.length > 0 ? p.barres[0] : 0;

      return {
        frets: p.frets,
        title: idx === 0 ? 'Thế cơ bản' : `Thế bấm ${idx + 1}`,
        barreFret,
        barreStartString: 0,
      };
    });
  }

  const currentPos = positions[selectedIdx] || positions[0];
  const displayName = transposeChord(chordName, 0, notation);

  const handlePlay = () => {
    if (currentPos && currentPos.frets) {
      playFretPositions(currentPos.frets);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-xs rounded-3xl bg-surface border border-line p-5 shadow-2xl text-center space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h3 className="text-2xl font-black text-ink">{displayName}</h3>
            {notation === 'vi' && (
              <span className="text-xs text-muted font-mono">{chordName}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted hover:text-ink hover:bg-bg transition"
            aria-label="Đóng bảng hợp âm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sơ đồ SVG phím đàn */}
        {currentPos ? (
          <div className="flex justify-center py-1">
            <div
              className="w-48 h-56 text-ink flex items-center justify-center [&_svg]:max-h-full"
              dangerouslySetInnerHTML={{
                __html: renderChordSvg({
                  chordName,
                  position: currentPos,
                  baseFret:
                    currentPos.frets.filter((x) => x > 0).length > 0 &&
                    Math.max(...currentPos.frets.filter((x) => x > 0)) > 5
                      ? Math.min(...currentPos.frets.filter((x) => x > 0))
                      : 1,
                }),
              }}
            />
          </div>
        ) : (
          <p className="text-xs text-muted py-8">Chưa có sơ đồ ngón bấm cho hợp âm này.</p>
        )}

        {/* Nút nghe thử Web Audio (kích hoạt AudioContext ngay trong event click) */}
        <button
          onClick={handlePlay}
          className="w-full py-2.5 px-4 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent-dark transition flex items-center justify-center gap-2 shadow-sm"
        >
          <Volume2 className="w-4 h-4" />
          <span>Nghe thử tiếng đàn</span>
        </button>

        {/* Chuyển đổi các thế bấm (nếu có nhiều thế bấm) */}
        {positions.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            {positions.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedIdx === idx
                    ? 'bg-soft text-accent border border-accent/30 font-bold'
                    : 'text-muted hover:text-ink bg-bg'
                }`}
              >
                {p.title || `Thế ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

