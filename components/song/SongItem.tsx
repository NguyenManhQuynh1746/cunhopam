import Link from 'next/link';

export interface SongItemData {
  id: string;
  title: string;
  slug: string;
  key?: string;
  artist_name?: string | null;
  rhythm_name?: string | null;
  genre_name?: string | null;
  view_count?: number;
  hot_views?: number;
  chords?: string[] | null;
  published_at?: string;
}

interface SongItemProps {
  song: SongItemData;
  index?: number;
}

export default function SongItem({ song, index }: SongItemProps) {
  const chords = Array.isArray(song.chords) ? song.chords : [];

  return (
    <Link
      href={`/bai-hat/${song.slug}`}
      className="group flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-surface border border-line hover:border-accent hover:shadow-md transition-all"
    >
      {index !== undefined && (
        <span className="w-7 sm:w-8 text-center text-sm sm:text-base font-bold text-muted group-hover:text-accent shrink-0">
          {index + 1}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-ink truncate group-hover:text-accent transition-colors">
            {song.title}
          </h3>
          {song.key && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-bg border border-line text-muted shrink-0">
              {song.key}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted truncate">
          <span>{song.artist_name || 'Nhiều nghệ sĩ'}</span>
          {song.rhythm_name && (
            <>
              <span>•</span>
              <span className="text-accent font-medium">{song.rhythm_name}</span>
            </>
          )}
          {song.genre_name && (
            <>
              <span>•</span>
              <span>{song.genre_name}</span>
            </>
          )}
        </div>

        {chords.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
            {chords.slice(0, 6).map((c, i) => (
              <span
                key={i}
                className="text-[11px] px-1.5 py-0.5 rounded bg-bg text-ink font-semibold shrink-0"
              >
                {c}
              </span>
            ))}
            {chords.length > 6 && (
              <span className="text-[10px] text-muted shrink-0">+{chords.length - 6}</span>
            )}
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs sm:text-sm font-semibold text-ink">
          {song.view_count ?? 0}
        </div>
        <div className="text-[11px] text-muted">lượt xem</div>
      </div>
    </Link>
  );
}

