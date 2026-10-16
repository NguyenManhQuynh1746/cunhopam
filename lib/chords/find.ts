import { normalizeChordName } from './normalize';

export interface SongWithChords {
  id: string;
  title: string;
  chords: string[];
  is_verified?: boolean;
  takedown_status?: string;
}

export interface SongChordMatchResult {
  id: string;
  title: string;
  totalChords: number;
  missingCount: number;
  matchType: 'ready' | 'missing_one';
  missingChords: string[];
  allChords: string[];
}

/**
 * Thuật toán tìm bài hát theo hợp âm đã biết (mô phỏng chính xác logic RPC của database)
 * @param songs Danh sách bài hát kiểm tra
 * @param knownChords Danh sách hợp âm người dùng đã biết
 * @param limit Giới hạn số bài hát tối đa
 */
export function filterSongsByKnownChords(
  songs: SongWithChords[],
  knownChords: string[],
  limit = 50
): {
  ready: SongChordMatchResult[];
  missingOne: SongChordMatchResult[];
  all: SongChordMatchResult[];
} {
  // 1. Kiểm tra giới hạn mảng đầu vào (tối đa 30 hợp âm)
  if (knownChords && knownChords.length > 30) {
    throw new Error('Danh sách hợp âm không được vượt quá 30 hợp âm.');
  }

  const effectiveLimit = Math.min(Math.max(limit, 1), 100);

  // 2. Chuẩn hoá danh sách hợp âm người dùng đã biết (bỏ bass, đưa về dạng chuẩn)
  const normalizedKnownSet = new Set(
    (knownChords || [])
      .map((c) => normalizeChordName(c))
      .filter((c) => c && c.length > 0)
  );

  const readyList: SongChordMatchResult[] = [];
  const missingOneList: SongChordMatchResult[] = [];

  for (const song of songs) {
    // Chỉ xét các bài hát đã duyệt và không bị khiếu nại
    if (song.is_verified === false || (song.takedown_status && song.takedown_status !== 'none')) {
      continue;
    }

    // Chuẩn hoá các hợp âm của bài hát và loại bỏ trùng lặp
    const normalizedSongChords = Array.from(
      new Set(
        (song.chords || [])
          .map((c) => normalizeChordName(c))
          .filter((c) => c && c.length > 0)
      )
    );

    // BỎ QUA các bài không có hợp âm nào
    if (normalizedSongChords.length === 0) {
      continue;
    }

    const missingChords: string[] = [];
    for (const chord of normalizedSongChords) {
      if (!normalizedKnownSet.has(chord)) {
        missingChords.push(chord);
      }
    }

    const missingCount = missingChords.length;

    if (missingCount === 0) {
      readyList.push({
        id: song.id,
        title: song.title,
        totalChords: normalizedSongChords.length,
        missingCount: 0,
        matchType: 'ready',
        missingChords: [],
        allChords: normalizedSongChords,
      });
    } else if (missingCount === 1) {
      missingOneList.push({
        id: song.id,
        title: song.title,
        totalChords: normalizedSongChords.length,
        missingCount: 1,
        matchType: 'missing_one',
        missingChords,
        allChords: normalizedSongChords,
      });
    }
  }

  const combined = [...readyList, ...missingOneList].slice(0, effectiveLimit);

  return {
    ready: readyList.slice(0, effectiveLimit),
    missingOne: missingOneList.slice(0, effectiveLimit),
    all: combined,
  };
}

