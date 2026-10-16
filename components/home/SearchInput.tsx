'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  initialQuery = '',
  placeholder = 'Tìm tên bài hát hoặc ca sĩ (ví dụ: "pho nho", "Trịnh Công Sơn")...',
  className = '',
}: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const isFirstRender = useRef(true);

  // Đồng bộ state khi URL query thay đổi
  useEffect(() => {
    setValue(searchParams.get('q') || '');
  }, [searchParams]);

  // Debounce 300ms khi người dùng gõ
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();

      if (trimmed) {
        params.set('q', trimmed);
        params.delete('page'); // Reset về trang 1 khi tìm kiếm mới
      } else {
        params.delete('q');
      }

      router.push(`/?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, router, searchParams]);

  const handleClear = () => {
    setValue('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Tìm kiếm bài hát"
        className="w-full bg-surface border border-line rounded-2xl py-3 pl-12 pr-10 text-sm text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent shadow-sm transition"
      />
      {value && (
        <button
          onClick={handleClear}
          type="button"
          className="absolute right-3.5 p-1 text-muted hover:text-ink rounded-full transition"
          aria-label="Xoá từ khoá tìm kiếm"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

