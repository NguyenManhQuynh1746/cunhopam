import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sliders, Timer } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bộ Công Cụ Cho Người Chơi Đàn Guitar | Cún Hợp Âm',
  description:
    'Bộ công cụ hỗ trợ chơi đàn guitar trực tuyến: Chỉnh dây guitar (tuner) và máy đếm nhịp (metronome).',
};

const TOOLS = [
  {
    id: 'chinh-day',
    title: 'Chỉnh dây đàn (Guitar Tuner)',
    desc: 'Lên dây đàn guitar qua micro với mô phỏng đầu cần đàn và kim chỉ cent chuẩn xác như GuitarTuna. Hỗ trợ Standard, Drop D, Half-Step Down.',
    href: '/cong-cu/chinh-day',
    icon: Sliders,
    active: true,
    tag: 'Sẵn sàng',
  },
  {
    id: 'dem-nhip',
    title: 'Máy đếm nhịp (Metronome)',
    desc: 'BPM 30 - 240, nhịp 2/4, 3/4, 4/4, 6/8, tap tempo, âm gõ phách đầu và thanh mini trong trang bài hát.',
    href: '/cong-cu/dem-nhip',
    icon: Timer,
    active: false,
    tag: 'Sắp ra mắt',
  },
];

export default function ToolsHubPage() {
  return (
    <div className="wrap py-8">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-black text-ink tracking-tight">
          Bộ Công Cụ Guitar
        </h1>
        <p className="text-sm text-muted mt-2">
          Các tiện ích thiết yếu giúp bạn chỉnh dây chuẩn xác và giữ nhịp chắc chắn khi chơi đàn.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const CardContent = (
            <div
              className={`p-6 rounded-3xl border transition-all h-full flex flex-col justify-between ${
                tool.active
                  ? 'bg-surface border-line hover:border-accent hover:shadow-lg cursor-pointer group'
                  : 'bg-surface/50 border-line/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      tool.active
                        ? 'bg-accent/15 text-accent group-hover:bg-accent group-hover:text-bg transition-colors'
                        : 'bg-muted/10 text-muted'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      tool.active
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : 'bg-muted/15 text-muted'
                    }`}
                  >
                    {tool.tag}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-ink mb-1.5 group-hover:text-accent transition-colors">
                  {tool.title}
                </h2>
                <p className="text-xs text-muted leading-relaxed">{tool.desc}</p>
              </div>

              {tool.active ? (
                <div className="mt-5 pt-4 border-t border-line/60 flex items-center justify-between text-xs font-bold text-accent">
                  <span>Mở công cụ chỉnh dây</span>
                  <span>→</span>
                </div>
              ) : (
                <div className="mt-5 pt-4 border-t border-line/40 text-xs text-muted">
                  Đang phát triển (Giai đoạn 5)
                </div>
              )}
            </div>
          );

          return tool.active ? (
            <Link key={tool.id} href={tool.href}>
              {CardContent}
            </Link>
          ) : (
            <div key={tool.id}>{CardContent}</div>
          );
        })}
      </div>
    </div>
  );
}
