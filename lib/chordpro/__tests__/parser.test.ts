import { describe, it, expect } from 'vitest';
import { parseChordPro, slugify } from '../parser';

describe('parseChordPro', () => {
  it('phân tích thành công bài hát ChordPro hợp lệ', () => {
    const raw = `{title: Bài ca hy vọng}
{artist: Văn Ký}
{key: C}
{rhythm: Ballad}
{license: public_domain}
{rights_holder: Public Domain}
{source: 1958}

[C]Từng đàn chim bay [G]về hướng mới
[Am]Rộn ràng câu [F]hát reo vui`;

    const res = parseChordPro(raw);
    expect(res.success).toBe(true);
    expect(res.song?.title).toBe('Bài ca hy vọng');
    expect(res.song?.artist).toBe('Văn Ký');
    expect(res.song?.license).toBe('public_domain');
    expect(res.song?.chords).toEqual(['C', 'G', 'Am', 'F']);
    expect(res.song?.slug).toBe('bai-ca-hy-vong-van-ky');
  });

  it('từ chối file thiếu trường license', () => {
    const raw = `{title: Test Song}
{artist: Unknown}

[C]Hello [G]world`;

    const res = parseChordPro(raw);
    expect(res.success).toBe(false);
    expect(res.errors?.some(e => e.includes('Thiếu trường giấy phép bản quyền'))).toBe(true);
  });

  it('từ chối file có license không hợp lệ', () => {
    const raw = `{title: Test Song}
{artist: Unknown}
{license: illegal_copy}

[C]Hello [G]world`;

    const res = parseChordPro(raw);
    expect(res.success).toBe(false);
    expect(res.errors?.some(e => e.includes('Giấy phép không hợp lệ'))).toBe(true);
  });

  it('từ chối file chứa hợp âm sai cú pháp', () => {
    const raw = `{title: Test Song}
{artist: Unknown}
{license: public_domain}

[C]Hello [INVALID_CHORD]world`;

    const res = parseChordPro(raw);
    expect(res.success).toBe(false);
    expect(res.errors?.some(e => e.includes('INVALID_CHORD'))).toBe(true);
  });
});

describe('slugify', () => {
  it('chuyển đổi tiếng Việt có dấu thành slug không dấu', () => {
    expect(slugify('Phố Nhỏ Mưa Bay')).toBe('pho-nho-mua-bay');
    expect(slugify('Đêm Đông')).toBe('dem-dong');
  });
});

