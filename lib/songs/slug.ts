import { removeVietnameseAccents } from '@/lib/search/unaccent';

/**
 * Chuyển đổi tên tiếng Việt thành slug URL an toàn, không dấu
 * Ví dụ: "Đường xưa lối cũ" -> "duong-xua-loi-cu"
 */
export function titleToSlug(title: string): string {
  if (!title || typeof title !== 'string') return '';

  const unaccented = removeVietnameseAccents(title);

  return unaccented
    .replace(/[^a-z0-9\s-]/g, '') // Bỏ các ký tự đặc biệt
    .replace(/\s+/g, '-')        // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-')         // Bỏ các gạch ngang liên tiếp
    .replace(/^-+|-+$/g, '');    // Bỏ gạch ngang ở đầu và cuối
}

/**
 * Xử lý trùng lặp slug bằng cách thêm hậu tố số (-2, -3...)
 */
export function resolveUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  const set = new Set(existingSlugs.map((s) => s.toLowerCase()));
  if (!set.has(baseSlug.toLowerCase())) {
    return baseSlug;
  }

  let counter = 2;
  while (set.has(`${baseSlug}-${counter}`.toLowerCase())) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
}

