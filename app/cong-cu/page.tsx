import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sliders, Activity, Timer, Zap, Music, HelpCircle, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bộ Công Cụ Cho Người Chơi Đàn Guitar & Ukulele | Cún Hợp Âm',
  description:
    'Bộ công cụ hỗ trợ tập đàn guitar trực tuyến: Chỉnh dây guitar (tuner), máy đếm nhịp (metronome), luyện chuyển hợp âm, máy tính capo, chuỗi tiến trình hợp âm.',
};

const TOOLS = [
  {
    id: 'chinh-day',
    title: 'Chỉnh dây đàn (Tuner)',
    desc: 'Lên dây đàn guitar qua micro với kim chỉ cent thời gian thực. Hỗ trợ chuẩn, Drop D, Half-Step Down.',
    href: '/cong-cu/chinh-day',
    icon: Sliders,
    active: true,
    tag: 'Sẵn sàng',
  },
  {
    id: 'dem-nhip',
    title: 'Máy đếm nhịp (Metronome)',
    desc: 'BPM 30 - 240, nhịp 2/4, 3/4, 4/4, 6/8, tap tempo, thanh mini trong trang bài hát.',
    href: '/cong-cu/dem-nhip',
    icon: Timer,
    active: false,
    tag: 'Giai đoạn 5b',
  },
  {
    id: 'luyen-chuyen-hop-am',
    title: 'Luyện chuyển hợp âm',
    desc: 'Luyện tốc độ chuyển giữa 2 hợp âm trong 60 giây, lưu tiến độ và biểu đồ tiến bộ.',
    href: '/cong-cu/luyen-chuyen-hop-am',
    icon: Activity,
    active: false,
    tag: 'Giai đoạn 5c',
  },
  {
    id: 'capo',
    title: 'Máy tính Capo',
    desc: 'Gợi ý vị trí kẹp capo và bộ thế bấm dễ nhất khi muốn đổi giọng hát.',
    href: '/cong-cu/capo',
    icon: Zap,
    active: false,
    tag: 'Giai đoạn 5d',
  },
  {
    id: 'chuoi-hop-am',
    title: 'Chuỗi hợp âm theo tông',
    desc: 'Gợi ý các vòng hòa thanh phổ biến (I–V–vi–IV, ii–V–I...) kèm nghe thử âm sắc.',
    href: '/cong-cu/chuoi-hop-am',
    icon: Music,
    active: false,
    tag: 'Giai đoạn 5e',
  },
  {
    id: 'cau-do',
    title: 'Câu đố thế bấm hợp âm',
    desc: 'Trắc nghiệm đoán tên hợp âm từ sơ đồ ngón bấm, bảng xếp hạng điểm tuần.',
    href: '/cong-cu/cau-do',
    icon: HelpCircle,
    active: false,
    tag: 'Giai đoạn 5g',
  },
];

export default function ToolsHubPage() {
  return (
    <div className="wrap py-8">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-black text-ink tracking-tight">
          Bộ Công Cụ Cho Người Chơi Đàn
        </h1>
        <p className="text-sm text-muted mt-2">
          Các tiện ích đắc lực giúp bạn luyện tập, chỉnh đàn và phát triển kỹ năng guitar & ukulele mỗi ngày.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const CardContent = (
            <div
              className={`p-5 rounded-3xl border transition-all h-full flex flex-col justify-between ${
                tool.active
                  ? 'bg-surface border-line hover:border-accent hover:shadow-md cursor-pointer group'
                  : 'bg-surface/50 border-line/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      tool.active
                        ? 'bg-accent/15 text-accent group-hover:bg-accent group-hover:text-bg transition-colors'
                        : 'bg-muted/10 text-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      tool.active
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                        : 'bg-muted/15 text-muted'
                    }`}
                  >
                    {tool.tag}
                  </span>
                </div>

                <h2 className="text-base font-bold text-ink mb-1 group-hover:text-accent transition-colors">
                  {tool.title}
                </h2>
                <p className="text-xs text-muted leading-relaxed">{tool.desc}</p>
              </div>

              {tool.active ? (
                <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs font-bold text-accent">
                  <span>Mở công cụ</span>
                  <span>→</span>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-line/40 text-[11px] text-muted">
                  Sắp ra mắt trong Giai đoạn 5
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

