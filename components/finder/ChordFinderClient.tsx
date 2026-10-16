'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import SongItem, { SongItemData } from '@/components/song/SongItem';
import ChordPopup from '@/components/song/ChordPopup';
import { useApp } from '@/context/AppContext';
import { formatNote } from '@/lib/chords/transpose';
import { Check, Plus, RefreshCw, Sparkles, BookOpen } from 'lucide-react';

const COMMON_CHORDS = [
  'C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'E',
  'Dm', 'Bm', 'Bb', 'C7', 'G7', 'D7', 'A7', 'E7',
  'F#m', 'B7', 'Dsus4', 'Fmaj7', 'Bm7', 'Cadd9'
];

interface MatchedSong extends SongItemData {
  missing_chords?: string[];
  match_type?: 'ready' | 'missing_one';
}

interface ChordFinderClientProps {
  user: User | null;
  initialDbChords: string[];
}

export default function ChordFinderClient({
  user,
  initialDbChords,
}: ChordFinderClientProps) {
  const { notation } = useApp();
  const [selectedChords, setSelectedChords] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [readySongs, setReadySongs] = useState<MatchedSong[]>([]);
  const [missingOneSongs, setMissingOneSongs] = useState<MatchedSong[]>([]);
  const [inspectChord, setInspectChord] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isFirstSync = useRef(true);

  // 1. Khởi tạo danh sách hợp âm đã biết (tránh Hydration mismatch bằng useEffect)
  useEffect(() => {
    let initialSet = new Set<string>();

    // Đọc từ localStorage
    try {
      const localData = localStorage.getItem('cunhopam_known_chords');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => initialSet.add(c));
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc localStorage:', e);
    }

    // Nếu đã đăng nhập: Gộp (Union) với dữ liệu từ database, không ghi đè
    if (user && initialDbChords && initialDbChords.length > 0) {
      initialDbChords.forEach((c) => initialSet.add(c));
    }

    // Mặc định chọn trước C, G, Am nếu chưa từng chọn hợp âm nào
    if (initialSet.size === 0) {
      initialSet = new Set(['C', 'G', 'Am']);
    }

    const mergedList = Array.from(initialSet);
    setSelectedChords(mergedList);
    setIsHydrated(true);

    // Lưu lại bản gộp vào localStorage
    try {
      localStorage.setItem('cunhopam_known_chords', JSON.stringify(mergedList));
    } catch {}
  }, [user, initialDbChords]);

  // 2. Hàm gọi RPC tìm bài hát từ Database
  const fetchMatchingSongs = useCallback(async (chords: string[]) => {
    if (!chords || chords.length === 0) {
      setReadySongs([]);
      setMissingOneSongs([]);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('find_songs_by_chords', {
        p_known_chords: chords.slice(0, 30),
        p_limit: 50,
      });

      if (!error && data) {
        const ready: MatchedSong[] = [];
        const missingOne: MatchedSong[] = [];

        data.forEach((item: any) => {
          const songObj: MatchedSong = {
            id: item.id,
            title: item.title,
            slug: item.slug,
            key: item.key,
            chords: item.all_chords,
            view_count: item.view_count,
            artist_name: item.artist_name,
            rhythm_name: item.rhythm_name,
            genre_name: item.genre_name,
            missing_chords: item.missing_chords,
            match_type: item.match_type,
          };

          if (item.match_type === 'ready') {
            ready.push(songObj);
          } else if (item.match_type === 'missing_one') {
            missingOne.push(songObj);
          }
        });

        setReadySongs(ready);
        setMissingOneSongs(missingOne);
      } else {
        console.warn('RPC find_songs_by_chords warning:', error?.message);
      }
    } catch (err) {
      console.error('Lỗi khi tìm bài theo hợp âm:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Tự động tìm bài và đồng bộ database khi danh sách hợp âm thay đổi
  useEffect(() => {
    if (!isHydrated) return;

    fetchMatchingSongs(selectedChords);

    // Lưu vào localStorage
    try {
      localStorage.setItem('cunhopam_known_chords', JSON.stringify(selectedChords));
    } catch {}

    // Đồng bộ lên database bảng user_known_chords có debounce nếu đã đăng nhập
    if (user) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(async () => {
        try {
          const supabase = createClient();
          // Xoá và chèn lại các hợp âm đã biết của người dùng
          await supabase.from('user_known_chords').delete().eq('user_id', user.id);
          if (selectedChords.length > 0) {
            const rows = selectedChords.map((chord_name) => ({
              user_id: user.id,
              chord_name,
            }));
            await supabase.from('user_known_chords').insert(rows);
          }
        } catch (e) {
          console.error('Lỗi đồng bộ user_known_chords:', e);
        }
      }, 600);
    }
  }, [selectedChords, isHydrated, user, fetchMatchingSongs]);

  // Xử lý bật/tắt chọn hợp âm
  const toggleChord = (chord: string) => {
    setSelectedChords((prev) => {
      if (prev.includes(chord)) {
        return prev.filter((c) => c !== chord);
      }
      if (prev.length >= 30) {
        alert('Bạn chỉ có thể chọn tối đa 30 hợp âm.');
        return prev;
      }
      return [...prev, chord];
    });
  };

  const handleResetChords = () => {
    setSelectedChords(['C', 'G', 'Am']);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight flex items-center gap-2">
          <span>Tìm bài hát theo hợp âm đã biết</span>
          <Sparkles className="w-6 h-6 text-accent" />
        </h1>
        <p className="text-sm sm:text-base text-muted max-w-2xl">
          Bấm chọn những hợp âm bạn đã bấm thành thạo. Hệ thống sẽ lọc ra các bài bạn có thể chơi được ngay lập tức hoặc các bài chỉ cần học thêm 1 hợp âm nữa!
        </p>
      </div>

      {/* Bảng chọn hợp âm */}
      <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted uppercase">
              Hợp âm bạn đã chọn ({selectedChords.length}/30):
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                ☁️ Đã đồng bộ tài khoản
              </span>
            ) : (
              <span className="text-[11px] text-muted">
                Lưu tạm trên trình duyệt
              </span>
            )}
            <button
              onClick={handleResetChords}
              className="text-xs text-muted hover:text-accent font-semibold p-1 flex items-center gap-1 transition"
              title="Đặt lại các hợp âm cơ bản"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>

        {/* Danh sách các chip hợp âm phổ biến */}
        <div className="flex flex-wrap gap-2">
          {COMMON_CHORDS.map((c) => {
            const isSelected = selectedChords.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleChord(c)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 active:scale-95 ${
                  isSelected
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-bg text-ink border border-line hover:border-accent'
                }`}
                aria-pressed={isSelected}
              >
                {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3 h-3 opacity-50" />}
                <span>{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Khu vực kết quả */}
      <div className="space-y-8">
        {/* Nhóm 1: Chơi được ngay */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-ink">
                🎉 Chơi được ngay ({readySongs.length})
              </h2>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                100% hợp âm đã biết
              </span>
            </div>
            {loading && <span className="text-xs text-muted animate-pulse">Đang tìm kiếm...</span>}
          </div>

          {readySongs.length === 0 ? (
            <div className="p-8 rounded-3xl border border-line bg-surface text-center space-y-2">
              <p className="text-sm font-semibold text-ink">
                Chưa có bài nào chỉ dùng các hợp âm bạn đã chọn.
              </p>
              <p className="text-xs text-muted">
                Hãy chọn thêm một vài hợp âm cơ bản như <strong className="text-accent">F, D, Em, Dm</strong> để mở rộng danh sách bài hát!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {readySongs.map((song, i) => (
                <SongItem key={song.id} song={song} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Nhóm 2: Chỉ thiếu 1 hợp âm */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-ink">
                🎯 Chỉ thiếu 1 hợp âm ({missingOneSongs.length})
              </h2>
              <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                Học thêm 1 thế bấm để chơi
              </span>
            </div>
          </div>

          {missingOneSongs.length === 0 ? (
            <div className="p-8 rounded-3xl border border-line bg-surface text-center text-xs text-muted">
              Không có bài hát nào thuộc nhóm chỉ thiếu 1 hợp âm.
            </div>
          ) : (
            <div className="space-y-3">
              {missingOneSongs.map((song, i) => {
                const missing = song.missing_chords && song.missing_chords[0] ? song.missing_chords[0] : null;

                return (
                  <div key={song.id} className="relative group">
                    <SongItem song={song} index={i} />
                    {missing && (
                      <div className="absolute right-24 sm:right-28 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setInspectChord(missing);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition flex items-center gap-1"
                          title={`Bấm xem thế bấm của hợp âm thiếu: ${missing}`}
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Thiếu: {missing}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Popup xem nhanh hợp âm bị thiếu */}
      {inspectChord && (
        <ChordPopup
          chordName={inspectChord}
          isOpen={!!inspectChord}
          onClose={() => setInspectChord(null)}
          notation={notation}
        />
      )}
    </div>
  );
}

