import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="space-y-3">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink leading-tight max-w-xl">
          Thư viện hợp âm cho người chơi guitar
        </h1>
        <p className="text-base sm:text-lg text-muted max-w-2xl">
          Tra cứu bài hát có hợp âm chuẩn, đổi tông theo giọng hát, xem sơ đồ ngón bấm trực quan và lưu trữ playlist riêng.
        </p>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Cột chính: Danh sách bài hát */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">Bài hát nổi bật</h2>
            <div className="inline-flex border border-line rounded-full p-1 bg-surface">
              <button className="px-3.5 py-1 text-xs font-semibold rounded-full bg-accent text-ai">
                Xem nhiều
              </button>
              <button className="px-3.5 py-1 text-xs font-semibold rounded-full text-muted hover:text-ink">
                Mới đăng
              </button>
            </div>
          </div>

          <div className="border border-line border-dashed rounded-2xl p-8 text-center bg-surface">
            <p className="text-muted text-sm">
              Trang danh sách bài hát đang được chuẩn bị cho Giai đoạn tiếp theo.
            </p>
          </div>
        </section>

        {/* Cột phụ: Bộ lọc & Gợi ý */}
        <aside className="space-y-4">
          <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
            <h3 className="text-base font-bold text-ink">Chưa biết chơi bài nào?</h3>
            <p className="text-xs text-muted leading-relaxed">
              Chọn các hợp âm bạn đã bấm được, cunhopam sẽ gợi ý ngay những bài hát vừa sức.
            </p>
            <Link
              href="/find"
              className="inline-block bg-accent hover:bg-accent-dark text-ai text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              Tìm theo hợp âm
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

