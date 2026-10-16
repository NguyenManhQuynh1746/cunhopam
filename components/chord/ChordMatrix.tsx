'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { chordToSlug } from '@/lib/chords/slug';
import { formatNote } from '@/lib/chords/transpose';

interface ChordMatrixProps {
  availableChords: Set<string>; // Set dạng `${root}_${suffix}`
}

const ROOTS = [
  { index: 0, en: 'C', vi: 'Đô', alt: null },
  { index: 1, en: 'C#', vi: 'Đô#', alt: 'Db' },
  { index: 2, en: 'D', vi: 'Rê', alt: null },
  { index: 3, en: 'D#', vi: 'Rê#', alt: 'Eb' },
  { index: 4, en: 'E', vi: 'Mi', alt: null },
  { index: 5, en: 'F', vi: 'Fa', alt: null },
  { index: 6, en: 'F#', vi: 'Fa#', alt: 'Gb' },
  { index: 7, en: 'G', vi: 'Sol', alt: null },
  { index: 8, en: 'G#', vi: 'Sol#', alt: 'Ab' },
  { index: 9, en: 'A', vi: 'La', alt: null },
  { index: 10, en: 'A#', vi: 'La#', alt: 'Bb' },
  { index: 11, en: 'B', vi: 'Si', alt: null },
];

const QUALITIES = [
  { key: 'major', label: 'Trưởng (maj)', displaySuffix: '' },
  { key: 'minor', label: 'Thứ (m)', displaySuffix: 'm' },
  { key: '7', label: 'Bảy (7)', displaySuffix: '7' },
  { key: 'maj7', label: 'Trưởng bảy (maj7)', displaySuffix: 'maj7' },
  { key: 'm7', label: 'Thứ bảy (m7)', displaySuffix: 'm7' },
  { key: 'sus4', label: 'Sus4', displaySuffix: 'sus4' },
  { key: 'sus2', label: 'Sus2', displaySuffix: 'sus2' },
  { key: 'dim', label: 'Giảm (dim)', displaySuffix: 'dim' },
  { key: 'dim7', label: 'Dim7', displaySuffix: 'dim7' },
  { key: 'aug', label: 'Tăng (aug)', displaySuffix: 'aug' },
  { key: 'add9', label: 'Add9', displaySuffix: 'add9' },
  { key: '6', label: '6', displaySuffix: '6' },
  { key: '9', label: '9', displaySuffix: '9' },
];

export default function ChordMatrix({ availableChords }: ChordMatrixProps) {
  const { notation, toggleNotation } = useApp();
  const [selectedRootIdx, setSelectedRootIdx] = useState<number | null>(null);

  const filteredRoots = selectedRootIdx !== null
    ? ROOTS.filter((r) => r.index === selectedRootIdx)
    : ROOTS;

  return (
    <div className="space-y-6">
      {/* Bộ điều khiển & lọc nhanh */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-line">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted uppercase">Lọc theo nốt:</span>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedRootIdx(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedRootIdx === null
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-bg text-ink hover:border-accent'
              }`}
            >
              Tất cả
            </button>
            {ROOTS.map((r) => {
              const rootName = notation === 'vi' ? r.vi : r.en;
              return (
                <button
                  key={r.index}
                  onClick={() => setSelectedRootIdx(r.index)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                    selectedRootIdx === r.index
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-bg text-muted hover:text-ink'
                  }`}
                >
                  {rootName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nút đổi cách gọi tên nốt */}
        <button
          onClick={toggleNotation}
          className="px-3 py-1.5 rounded-xl border border-line bg-bg text-xs font-bold text-ink hover:border-accent transition shrink-0"
        >
          {notation === 'vi' ? '🇻🇳 Đô Rê Mi' : '🇺🇸 C D E'}
        </button>
      </div>

      {/* Bảng ma trận hợp âm */}
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-sm">
        <table className="w-full text-center border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-bg/60 border-b border-line text-xs font-bold text-muted">
              <th className="py-3 px-4 text-left">Nốt gốc (Kèm đồng âm)</th>
              {QUALITIES.map((q) => (
                <th key={q.key} className="py-3 px-2 whitespace-nowrap">
                  {q.displaySuffix || 'maj'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {filteredRoots.map((r) => {
              const rootDisplay = formatNote(r.index, notation);
              const altDisplay = r.alt
                ? notation === 'vi'
                  ? formatNote(r.index, 'vi', true)
                  : r.alt
                : null;

              return (
                <tr key={r.index} className="hover:bg-bg/40 transition-colors">
                  <td className="py-3 px-4 text-left font-black text-ink">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base text-accent">{rootDisplay}</span>
                      {altDisplay && (
                        <span className="text-xs text-muted font-normal">
                          / {altDisplay}
                        </span>
                      )}
                    </div>
                  </td>

                  {QUALITIES.map((q) => {
                    const chordName = `${r.en}${q.displaySuffix}`;
                    const dbKey = `${r.en}_${q.key}`;
                    const hasData = availableChords.has(dbKey);
                    const slug = chordToSlug(chordName);

                    return (
                      <td key={q.key} className="py-2.5 px-2">
                        {hasData ? (
                          <Link
                            href={`/hop-am/${slug}`}
                            className="inline-block px-2.5 py-1 rounded-lg font-bold text-xs bg-bg hover:bg-accent hover:text-white border border-line hover:border-accent transition shadow-2xs"
                            title={`Xem thế bấm hợp âm ${chordName}`}
                          >
                            {notation === 'vi'
                              ? `${formatNote(r.index, 'vi')}${q.displaySuffix}`
                              : chordName}
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted/60 italic select-none">
                            chưa có
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

