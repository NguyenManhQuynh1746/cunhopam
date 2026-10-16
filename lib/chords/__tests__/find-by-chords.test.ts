import { describe, it, expect } from 'vitest';
import { filterSongsByKnownChords, SongWithChords } from '../find';

describe('filterSongsByKnownChords', () => {
  const sampleSongs: SongWithChords[] = [
    {
      id: '1',
      title: 'Bài hát Ba hợp âm',
      chords: ['C', 'G', 'Am'],
      is_verified: true,
      takedown_status: 'none',
    },
    {
      id: '2',
      title: 'Bài hát Bốn hợp âm',
      chords: ['C', 'G', 'Am', 'F'],
      is_verified: true,
      takedown_status: 'none',
    },
    {
      id: '3',
      title: 'Bài hát Nhiều hợp âm',
      chords: ['C', 'G', 'Am', 'F', 'Dm', 'Em'],
      is_verified: true,
      takedown_status: 'none',
    },
    {
      id: '4',
      title: 'Bài hát có Slash Chords',
      chords: ['C/G', 'D/F#', 'G'],
      is_verified: true,
      takedown_status: 'none',
    },
    {
      id: '5',
      title: 'Bài hát dùng nốt Giáng (Bb)',
      chords: ['Bb', 'F', 'C'],
      is_verified: true,
      takedown_status: 'none',
    },
    {
      id: '6',
      title: 'Bài không có hợp âm',
      chords: [],
      is_verified: true,
      takedown_status: 'none',
    },
    {
      id: '7',
      title: 'Bài chưa duyệt',
      chords: ['C', 'G'],
      is_verified: false,
      takedown_status: 'none',
    },
    {
      id: '8',
      title: 'Bài bị khiếu nại bản quyền',
      chords: ['C', 'G'],
      is_verified: true,
      takedown_status: 'removed',
    },
  ];

  it('1. Chơi được ngay: bài dùng C, G, Am khi người dùng biết C, G, Am, F', () => {
    const known = ['C', 'G', 'Am', 'F'];
    const res = filterSongsByKnownChords(sampleSongs, known);

    const readyIds = res.ready.map((s) => s.id);
    expect(readyIds).toContain('1'); // Bài 1 (C, G, Am) đủ 100%
    expect(readyIds).toContain('2'); // Bài 2 (C, G, Am, F) đủ 100%
  });

  it('2. Chỉ thiếu 1 hợp âm: bài dùng C, G, Am, F nhưng người dùng chỉ biết C, G, Am', () => {
    const known = ['C', 'G', 'Am'];
    const res = filterSongsByKnownChords(sampleSongs, known);

    const missingOne = res.missingOne.find((s) => s.id === '2');
    expect(missingOne).toBeDefined();
    expect(missingOne?.missingCount).toBe(1);
    expect(missingOne?.missingChords).toEqual(['F']);
  });

  it('3. Thiếu nhiều hơn 1 hợp âm: không xuất hiện ở cả danh sách Chơi được ngay và Thiếu 1', () => {
    const known = ['C', 'G'];
    const res = filterSongsByKnownChords(sampleSongs, known);

    const allMatchedIds = res.all.map((s) => s.id);
    expect(allMatchedIds).not.toContain('3'); // Bài 3 thiếu Am, F, Dm, Em (4 hợp âm)
  });

  it('4. Danh sách hợp âm đã biết rỗng ([]): không trả về bài nào', () => {
    const res = filterSongsByKnownChords(sampleSongs, []);
    expect(res.ready).toHaveLength(0);
    expect(res.missingOne).toHaveLength(0);
  });

  it('5. Hợp âm có bass (C/G, D/F#) tính là hợp âm gốc (C, D) khi tìm', () => {
    // Người dùng biết C, D, G -> Bài 4 (C/G, D/F#, G) được tính là đủ 100%
    const known = ['C', 'D', 'G'];
    const res = filterSongsByKnownChords(sampleSongs, known);

    const readyIds = res.ready.map((s) => s.id);
    expect(readyIds).toContain('4');
  });

  it('6. Hợp âm khác tên nhưng cùng nốt (A# và Bb): tìm thấy bài dùng Bb khi chọn A# và ngược lại', () => {
    // Bài 5 dùng Bb, F, C. Người dùng chọn A#, F, C
    const knownWithSharp = ['A#', 'F', 'C'];
    const res = filterSongsByKnownChords(sampleSongs, knownWithSharp);

    const readyIds = res.ready.map((s) => s.id);
    expect(readyIds).toContain('5');
  });

  it('7. Bài không có hợp âm nào (chords: []): bị loại bỏ', () => {
    const known = ['C', 'G', 'Am', 'F', 'D', 'Em', 'Bb'];
    const res = filterSongsByKnownChords(sampleSongs, known);

    const allIds = res.all.map((s) => s.id);
    expect(allIds).not.toContain('6');
  });

  it('8. Mảng đầu vào quá dài (> 30 hợp âm): ném lỗi kiểm tra', () => {
    const tooManyChords = Array.from({ length: 31 }, (_, i) => `C${i}`);
    expect(() => filterSongsByKnownChords(sampleSongs, tooManyChords)).toThrow(
      'Danh sách hợp âm không được vượt quá 30 hợp âm.'
    );
  });

  it('9. Tự động loại bỏ bài chưa duyệt (is_verified = false) hoặc bị khiếu nại (takedown_status != "none")', () => {
    const known = ['C', 'G'];
    const res = filterSongsByKnownChords(sampleSongs, known);

    const allIds = res.all.map((s) => s.id);
    expect(allIds).not.toContain('7');
    expect(allIds).not.toContain('8');
  });
});

