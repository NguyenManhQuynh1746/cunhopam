'use client';

import { useState, useEffect } from 'react';
import { getAllChordPositions } from '@/lib/chords/diagram';
import { playFretPositions } from '@/lib/chords/audio';
import { transposeChord } from '@/lib/chords/transpose';
import ChordDiagramSvg, { ChordPositionProps } from '@/components/chord/ChordDiagramSvg';
import { Volume2, X } from 'lucide-react';

interface DbChordPosition {
  frets: number[];
  fingers?: number[];
  barres?: number[];
  baseFret?: number;
  capo?: boolean;
}

interface ChordPopupProps {
  chordName: string;
  isOpen: boolean;
  onClose: () => void;
  notation: 'en' | 'vi';
  dbPositions?: DbChordPosition[] | null;
  initialInstrument?: 'guitar' | 'ukulele';
}

export default function ChordPopup({
  chordName,
  isOpen,
  onClose,
  notation,
  dbPositions,
  initialInstrument = 'guitar',
}: ChordPopupProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [instrument, setInstrument] = useState<'guitar' | 'ukulele'>(initialInstrument);

  // Đọc sở thích nhạc cụ từ localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cunhopam_instrument') as 'guitar' | 'ukulele';
      if (saved) setInstrument(saved);
    }
  }, []);

  // Reset về vị trí đầu tiên khi đổi hợp âm
  useEffect(() => {
    setSelectedIdx(0);
  }, [chordName, instrument]);

  const toggleInstrument = (inst: 'guitar' | 'ukulele') => {
    setInstrument(inst);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cunhopam_instrument', inst);
    }
  };

  if (!isOpen || !chordName) return null;

  // Lấy danh sách thế bấm
  let positions: ChordPositionProps[] = [];

  if (dbPositions && dbPositions.length > 0) {
    positions = dbPositions.map((p) => ({
      frets: p.frets,
      fingers: p.fingers,
      barres: p.barres,
      baseFret: p.baseFret,
      capo: p.capo,
    }));
  } else {
    // Fallback guitar shapes từ lib/chords
    positions = getAllChordPositions(chordName).map((p) => ({
      frets: p.frets,
      barres: p.barreFret > 0 ? [p.barreFret] : [],
    }));
  }

  const currentPos = positions[selectedIdx] || positions[0];
  const displayName = transposeChord(chordName, 0, notation);

  const handlePlay = () => {
    if (currentPos && currentPos.frets) {
      playFretPositions(currentPos.frets, instrument);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-xs rounded-3xl bg-surface border border-line p-5 shadow-2xl text-center space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h3 className="text-2xl font-black text-ink">{displayName}</h3>
            {notation === 'vi' && (
              <span className="text-xs text-muted font-mono">{chordName}</span>
            )}
          </div>

          {/* Công tắc chọn Guitar / Ukulele */}
          <div className="flex items-center bg-bg p-0.5 rounded-xl border border-line text-xs font-semibold">
            <button
              onClick={() => toggleInstrument('guitar')}
              className={`px-2 py-1 rounded-lg transition ${
                instrument === 'guitar'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Guitar
            </button>
            <button
              onClick={() => toggleInstrument('ukulele')}
              className={`px-2 py-1 rounded-lg transition ${
                instrument === 'ukulele'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Uke
            </button>
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
            <ChordDiagramSvg
              position={currentPos}
              instrument={instrument}
              className="w-48 h-56"
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
          <span>Nghe thử tiếng đàn ({instrument === 'ukulele' ? 'Ukulele' : 'Guitar'})</span>
        </button>

        {/* Chuyển đổi các thế bấm (nếu có nhiều thế bấm) */}
        {positions.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            {positions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedIdx === idx
                    ? 'bg-soft text-accent border border-accent/30 font-bold'
                    : 'text-muted hover:text-ink bg-bg'
                }`}
              >
                {`Thế ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
