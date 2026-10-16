'use client';

import React, { useState } from 'react';
import { chordToDiagram, getAllChordPositions, formatNote, ChordPositionData } from '@/lib/chords';
import { useApp } from '@/context/AppContext';
import { Music, Volume2 } from 'lucide-react';

const ROOTS = [
  { key: 'C', index: 0 },
  { key: 'C#', index: 1 },
  { key: 'D', index: 2 },
  { key: 'D#', index: 3 },
  { key: 'E', index: 4 },
  { key: 'F', index: 5 },
  { key: 'F#', index: 6 },
  { key: 'G', index: 7 },
  { key: 'G#', index: 8 },
  { key: 'A', index: 9 },
  { key: 'A#', index: 10 },
  { key: 'B', index: 11 },
];

const QUALITIES = [
  { label: 'Trưởng', suffix: '' },
  { label: 'Thứ (m)', suffix: 'm' },
  { label: 'Bảy (7)', suffix: '7' },
  { label: 'Thứ 7 (m7)', suffix: 'm7' },
  { label: 'Trưởng 7 (maj7)', suffix: 'maj7' },
  { label: 'Sus4', suffix: 'sus4' },
];

const POPULAR_CHORDS = ['C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'E', 'Bm7', 'Cmaj7'];

export default function ChordsPage() {
  const { notation } = useApp();
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [positionIdx, setPositionIdx] = useState(0);

  const currentChordName = `${selectedRoot}${selectedQuality}`;
  const positions: ChordPositionData[] = getAllChordPositions(currentChordName);
  const currentDiagram = chordToDiagram(currentChordName, positionIdx);

  const handleSelectPopular = (chord: string) => {
    if (chord.endsWith('maj7')) {
      setSelectedRoot(chord.slice(0, -4));
      setSelectedQuality('maj7');
    } else if (chord.endsWith('m7')) {
      setSelectedRoot(chord.slice(0, -2));
      setSelectedQuality('m7');
    } else if (chord.endsWith('sus4')) {
      setSelectedRoot(chord.slice(0, -4));
      setSelectedQuality('sus4');
    } else if (chord.endsWith('7')) {
      setSelectedRoot(chord.slice(0, -1));
      setSelectedQuality('7');
    } else if (chord.endsWith('m')) {
      setSelectedRoot(chord.slice(0, -1));
      setSelectedQuality('m');
    } else {
      setSelectedRoot(chord);
      setSelectedQuality('');
    }
    setPositionIdx(0);
  };

  return (
    <div className="space-y-8">
      {/* Tiêu đề trang */}
      <section className="space-y-2">
        <h1 className="text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
          <Music className="w-8 h-8 text-accent" />
          <span>Tra cứu hợp âm guitar</span>
        </h1>
        <p className="text-muted text-sm sm:text-base max-w-2xl">
          Cơ sở dữ liệu hơn 2.100 thế bấm hợp âm guitar mã nguồn mở chuẩn xác từ{' '}
          <strong className="text-ink">chords-db</strong>. Chọn nốt gốc và loại hợp âm để xem chi tiết.
        </p>
      </section>

      {/* Khu vực tra cứu chính */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Cột 1 & 2: Hiển thị sơ đồ hợp âm lớn */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl sm:text-5xl font-black text-ink tracking-tight">
                  {currentChordName}
                </h2>
                <span className="text-sm font-semibold text-muted bg-soft px-3 py-1 rounded-full">
                  {notation === 'vi'
                    ? `${formatNote(ROOTS.find(r => r.key === selectedRoot)?.index || 0, 'vi')} ${QUALITIES.find(q => q.suffix === selectedQuality)?.label || ''}`
                    : `${selectedRoot} ${QUALITIES.find(q => q.suffix === selectedQuality)?.label || ''}`}
                </span>
              </div>
              <p className="text-xs text-muted mt-2">
                Đang hiển thị thế bấm: <strong>{positions[positionIdx]?.title || 'Thế bấm chuẩn'}</strong>
              </p>
            </div>

            {/* Chuyển đổi các thế bấm (Positions) */}
            {positions.length > 1 && (
              <div className="flex items-center gap-1.5 bg-bg p-1 rounded-full border border-line">
                {positions.map((pos, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPositionIdx(idx)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      positionIdx === idx
                        ? 'bg-accent text-ai'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    Thế {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sơ đồ phím bấm SVG */}
          <div className="flex flex-col items-center justify-center p-6 bg-bg/50 rounded-2xl border border-line">
            {currentDiagram?.svgString ? (
              <div
                className="w-full max-w-[240px] drop-shadow-sm"
                dangerouslySetInnerHTML={{ __html: currentDiagram.svgString }}
              />
            ) : (
              <p className="text-muted text-sm py-12">Không tìm thấy sơ đồ cho hợp âm này.</p>
            )}

            <div className="mt-4 text-xs text-muted flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pick inline-block border border-ink" />
              <span>Chấm vàng: Vị trí bấm ngón</span>
              <span className="mx-2 text-line">•</span>
              <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
              <span>Thanh tím: Thế chặn Barre</span>
            </div>
          </div>
        </div>

        {/* Cột 3: Bảng chọn nốt gốc & chất hợp âm */}
        <aside className="space-y-5">
          {/* Nốt gốc */}
          <div className="bg-surface border border-line rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Nốt gốc (Root)</h3>
            <div className="grid grid-cols-4 gap-2">
              {ROOTS.map(r => {
                const isSelected = selectedRoot === r.key;
                const noteLabel = notation === 'vi' ? formatNote(r.index, 'vi') : r.key;

                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      setSelectedRoot(r.key);
                      setPositionIdx(0);
                    }}
                    className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-accent text-ai border-accent shadow-sm'
                        : 'bg-surface hover:bg-bg border-line text-ink'
                    }`}
                  >
                    {noteLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loại hợp âm */}
          <div className="bg-surface border border-line rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Loại hợp âm (Quality)</h3>
            <div className="flex flex-wrap gap-2">
              {QUALITIES.map(q => {
                const isSelected = selectedQuality === q.suffix;

                return (
                  <button
                    key={q.suffix}
                    type="button"
                    onClick={() => {
                      setSelectedQuality(q.suffix);
                      setPositionIdx(0);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-accent text-ai border-accent'
                        : 'bg-surface hover:bg-bg border-line text-muted hover:text-ink'
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hợp âm thông dụng */}
          <div className="bg-surface border border-line rounded-3xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink">Hợp âm phổ biến</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CHORDS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelectPopular(c)}
                  className="px-3 py-1 bg-soft hover:bg-line text-ink text-xs font-bold rounded-full transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
