import { describe, it, expect } from 'vitest';
import { removeVietnameseAccents, matchesSearchQuery } from '../unaccent';

describe('removeVietnameseAccents', () => {
  it('xử lý chuẩn xác ca "Đường" -> "duong" và "Phố nhỏ" -> "pho nho"', () => {
    expect(removeVietnameseAccents('Đường')).toBe('duong');
    expect(removeVietnameseAccents('Phố nhỏ')).toBe('pho nho');
  });

  it('xử lý các từ tiếng Việt phức tạp có dấu hoa/thường', () => {
    expect(removeVietnameseAccents('Đà Nẵng')).toBe('da nang');
    expect(removeVietnameseAccents('Chờ em cuối con hẻm')).toBe('cho em cuoi con hem');
    expect(removeVietnameseAccents('Về nhà thôi')).toBe('ve nha thoi');
  });
});

describe('matchesSearchQuery', () => {
  it('tìm kiếm không phân biệt dấu tiếng Việt', () => {
    expect(matchesSearchQuery('Phố nhỏ mưa bay', 'pho nho')).toBe(true);
    expect(matchesSearchQuery('Đường xưa lối cũ', 'duong')).toBe(true);
    expect(matchesSearchQuery('Hoàng hôn trên sông', 'hoang hon')).toBe(true);
    expect(matchesSearchQuery('Sáng chủ nhật', 'chu nhat')).toBe(true);
    expect(matchesSearchQuery('Bài ca hy vọng', 'khong khop')).toBe(false);
  });
});

