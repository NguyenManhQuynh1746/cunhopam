'use client';

import React from 'react';

export interface ChordPositionProps {
  frets: number[];
  fingers?: number[];
  barres?: number[];
  baseFret?: number;
  capo?: boolean;
}

interface ChordDiagramSvgProps {
  chordName?: string;
  position: ChordPositionProps;
  instrument?: 'guitar' | 'ukulele';
  className?: string;
  width?: number;
  height?: number;
}

export default function ChordDiagramSvg({
  chordName,
  position,
  instrument = 'guitar',
  className = 'w-full max-w-[220px] h-auto select-none',
  width = 240,
  height = 290,
}: ChordDiagramSvgProps) {
  const { frets = [], fingers = [], barres = [] } = position;

  // Tự động nhận diện ukulele nếu có 4 phím
  const isUkulele = instrument === 'ukulele' || frets.length === 4;
  const numStrings = isUkulele ? 4 : 6;

  // Tính phím cơ bản (baseFret)
  const positiveFrets = frets.filter((f) => f > 0);
  const maxFret = positiveFrets.length > 0 ? Math.max(...positiveFrets) : 0;
  const minFret = positiveFrets.length > 0 ? Math.min(...positiveFrets) : 1;

  let baseFret = position.baseFret || 1;
  if (!position.baseFret) {
    baseFret = maxFret <= 5 ? 1 : minFret;
  }

  // Toạ độ vẽ
  const top = 60;
  const rh = 40; // Chiều cao mỗi ngăn phím (fret height)
  const numFrets = 5;

  // Tính toạ độ X cho các dây
  const xOffset = isUkulele ? 60 : 40;
  const stringSpacing = isUkulele ? 40 : 32;
  const sx = (i: number) => xOffset + i * stringSpacing;

  const widthFretboard = (numStrings - 1) * stringSpacing;
  const xLeft = xOffset;
  const xRight = xOffset + widthFretboard;

  // Kiểm tra thanh chặn Barre
  const barreFret = barres && barres.length > 0 ? barres[0] : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label={`Sơ đồ hợp âm ${chordName || ''} (${isUkulele ? 'Ukulele' : 'Guitar'})`}
      role="img"
    >
      {/* Tên hợp âm nếu có */}
      {chordName && (
        <text
          x={width / 2}
          y="28"
          textAnchor="middle"
          className="fill-foreground font-black text-lg font-sans"
        >
          {chordName}
        </text>
      )}

      {/* 5 Ngăn phím ngang */}
      {Array.from({ length: numFrets + 1 }).map((_, i) => {
        const isNut = i === 0 && baseFret === 1;
        const y = top + i * rh;
        return (
          <line
            key={`fret-${i}`}
            x1={xLeft}
            x2={xRight}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeWidth={isNut ? 5 : 1.2}
            className={isNut ? 'text-foreground' : 'text-border opacity-70'}
          />
        );
      })}

      {/* Các dây dọc */}
      {Array.from({ length: numStrings }).map((_, i) => {
        const x = sx(i);
        const strokeW = isUkulele ? 1.5 : 1 + (numStrings - 1 - i) * 0.25;
        return (
          <line
            key={`string-${i}`}
            x1={x}
            x2={x}
            y1={top}
            y2={top + numFrets * rh}
            stroke="currentColor"
            strokeWidth={strokeW}
            className="text-foreground opacity-60"
          />
        );
      })}

      {/* Thanh Barre chặn ngón (nếu có) */}
      {barreFret > 0 && barreFret >= baseFret && barreFret < baseFret + numFrets && (
        <rect
          x={xLeft - 10}
          y={top + (barreFret - baseFret + 0.5) * rh - 11}
          width={widthFretboard + 20}
          height={22}
          rx={11}
          fill="var(--accent, #2838d8)"
          opacity="0.85"
        />
      )}

      {/* Hiển thị nốt bấm, dây câm (X), dây buông (O) */}
      {frets.slice(0, numStrings).map((fret, i) => {
        const x = sx(i);
        const fingerNum = fingers && fingers[i] ? fingers[i] : null;

        if (fret < 0) {
          // Dây câm (X)
          return (
            <text
              key={`mute-${i}`}
              x={x}
              y="45"
              textAnchor="middle"
              className="fill-muted font-bold text-base font-sans select-none"
            >
              ×
            </text>
          );
        }

        if (fret === 0) {
          // Dây buông (O)
          return (
            <circle
              key={`open-${i}`}
              cx={x}
              cy="40"
              r="6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted"
            />
          );
        }

        // Chấm tròn điểm bấm nốt (màu vàng pick)
        const cy = top + (fret - baseFret + 0.5) * rh;
        return (
          <g key={`dot-${i}`}>
            <circle
              cx={x}
              cy={cy}
              r="12"
              fill="var(--pick, #ffc933)"
              stroke="#101828"
              strokeWidth="1.5"
            />
            {/* Hiển thị số ngón tay: 1=trỏ, 2=giữa, 3=áp út, 4=út */}
            {fingerNum && fingerNum > 0 && (
              <text
                x={x}
                y={cy + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="#101828"
                className="select-none font-sans"
              >
                {fingerNum}
              </text>
            )}
          </g>
        );
      })}

      {/* Nhãn số ngăn phím bắt đầu (ô N) nếu phím > 1 */}
      {baseFret > 1 && (
        <text
          x={xLeft - 18}
          y={top + rh * 0.5 + 4}
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          className="fill-muted font-sans"
        >
          ô {baseFret}
        </text>
      )}
    </svg>
  );
}

