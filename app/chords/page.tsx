import React from 'react';
import { chordToDiagram } from '@/lib/chords';

export default function ChordsPage() {
  const sampleChord = chordToDiagram('C');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">Tra cứu hợp âm</h1>
        <p className="text-muted text-sm max-w-xl">
          Chọn nốt gốc và loại hợp âm để xem sơ đồ ngón bấm phím đàn và các biến thể thế bấm.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6 max-w-lg">
        <h2 className="text-lg font-bold text-ink mb-2">Thử nghiệm render sơ đồ hợp âm C</h2>
        {sampleChord?.svgString && (
          <div
            className="flex justify-center p-4"
            dangerouslySetInnerHTML={{ __html: sampleChord.svgString }}
          />
        )}
      </div>
    </div>
  );
}

