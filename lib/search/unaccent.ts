/**
 * Chuẩn hóa chuỗi tiếng Việt thành chuỗi không dấu, chữ thường
 * Đặc biệt xử lý riêng chữ cái đ / Đ
 */
export function removeVietnameseAccents(str: string): string {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/[đĐ]/g, match => (match === 'Đ' ? 'D' : 'd'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Kiểm tra xem chuỗi văn bản (tiếng Việt có dấu hoặc không) có khớp với từ khoá tìm kiếm không
 */
export function matchesSearchQuery(text: string, query: string): boolean {
  if (!query) return true;
  if (!text) return false;

  const normalizedText = removeVietnameseAccents(text);
  const normalizedQuery = removeVietnameseAccents(query);

  return normalizedText.includes(normalizedQuery);
}

