import { describe, it, expect } from 'vitest';
import { validateChordPro } from '@/lib/chordpro/validator';
import { validateSongLicense } from '@/lib/songs/license';
import { titleToSlug, resolveUniqueSlug } from '@/lib/songs/slug';

describe('Giai đoạn 4: Kiểm thử Validator ChordPro, Bản quyền & Slug', () => {
  describe('1. validateChordPro', () => {
    it('Phát hiện nội dung hợp lệ với hợp âm chuẩn', () => {
      const content = `
{title: Diễm xưa}
[Am]Mưa vẫn mưa bay trên tầng tháp [Dm]cổ
Dài tay em [G]mấy thuở mắt xanh [C]xao
      `.trim();

      const result = validateChordPro(content);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.chords).toContain('Am');
      expect(result.chords).toContain('Dm');
      expect(result.chords).toContain('G');
      expect(result.chords).toContain('C');
    });

    it('Báo lỗi dòng và tên hợp âm khi gặp hợp âm không hợp lệ', () => {
      const content = `
Dòng 1 bình thường
[Am]Dòng 2 [XYZ123] có hợp âm lạ
[Dm]Dòng 3 [C#dim7] hợp âm phức tạp nhưng chuẩn
[G]Dòng 4 [H7] hợp âm chữ H không có trong nhạc lý
      `.trim();

      const result = validateChordPro(content);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(2);

      const err1 = result.errors.find((e) => e.chord === 'XYZ123');
      expect(err1).toBeDefined();
      expect(err1?.line).toBe(2);

      const err2 = result.errors.find((e) => e.chord === 'H7');
      expect(err2).toBeDefined();
      expect(err2?.line).toBe(4);
    });

    it('Chặn thẻ mã lệnh nguy hiểm (HTML Injection / XSS)', () => {
      const content = `
[C]Xin chào <script>alert('xss')</script>
[G]Bài hát nguy hiểm
      `.trim();

      const result = validateChordPro(content);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('không an toàn'))).toBe(true);
    });
  });

  describe('2. validateSongLicense (Khai báo bản quyền)', () => {
    it('Bài hát tự sáng tác (original) hợp lệ khi đã tick cam đoan', () => {
      const result = validateSongLicense({
        license_type: 'original',
        rights_holder: 'Nguyễn Văn A',
        terms_agreed: true,
      });

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it('Bài hát chưa tick cam đoan sẽ bị từ chối', () => {
      const result = validateSongLicense({
        license_type: 'public_domain',
        terms_agreed: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.terms_agreed).toBeDefined();
    });

    it('Bài hát đã cấp phép (permission) bắt buộc phải có link hoặc ghi chú chứng minh', () => {
      const invalidResult = validateSongLicense({
        license_type: 'permission',
        terms_agreed: true,
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.license_note).toBeDefined();

      const validResult = validateSongLicense({
        license_type: 'permission',
        source_url: 'https://example.com/tac-gia-cho-phep',
        terms_agreed: true,
      });
      expect(validResult.isValid).toBe(true);
    });

    it('Bài hát cộng đồng (user_submitted) yêu cầu ghi tên tác giả gốc và đưa ra cảnh báo', () => {
      const noAuthorResult = validateSongLicense({
        license_type: 'user_submitted',
        terms_agreed: true,
      });
      expect(noAuthorResult.isValid).toBe(false);
      expect(noAuthorResult.errors.rights_holder).toBeDefined();

      const withAuthorResult = validateSongLicense({
        license_type: 'user_submitted',
        rights_holder: 'Trịnh Công Sơn',
        terms_agreed: true,
      });
      expect(withAuthorResult.isValid).toBe(true);
      expect(withAuthorResult.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('3. titleToSlug & resolveUniqueSlug', () => {
    it('Chuyển đổi tiêu đề tiếng Việt có dấu thành slug không dấu chuẩn', () => {
      expect(titleToSlug('Đường Xưa Lối Cũ')).toBe('duong-xua-loi-cu');
      expect(titleToSlug('Phố Kỷ Niệm (Acoustic Version) - 2026!')).toBe('pho-ky-niem-acoustic-version-2026');
      expect(titleToSlug('Đêm Thấy Ta Là Thác Đổ')).toBe('dem-thay-ta-la-thac-do');
    });

    it('Tự sinh hậu tố số khi trùng lặp slug', () => {
      const existing = ['diem-xua', 'diem-xua-2', 'ha-trang'];
      expect(resolveUniqueSlug('diem-xua', existing)).toBe('diem-xua-3');
      expect(resolveUniqueSlug('ha-trang', existing)).toBe('ha-trang-2');
      expect(resolveUniqueSlug('bai-ca-dat-phuong-nam', existing)).toBe('bai-ca-dat-phuong-nam');
    });
  });
});

