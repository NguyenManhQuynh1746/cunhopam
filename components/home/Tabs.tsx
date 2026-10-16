'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const TABS = [
  { key: 'today', label: '🔥 Hot hôm nay' },
  { key: 'week', label: '📈 Hot tuần' },
  { key: 'month', label: '🌟 Hot tháng' },
  { key: 'new', label: '✨ Mới đăng' },
];

interface TabsProps {
  currentTab: string;
}

export default function Tabs({ currentTab }: TabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    params.delete('page'); // Reset về trang 1
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-1.5 p-1 bg-surface border border-line rounded-xl overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const isActive = (currentTab || 'today') === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              isActive
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:text-ink hover:bg-bg'
            }`}
            aria-selected={isActive}
            role="tab"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

