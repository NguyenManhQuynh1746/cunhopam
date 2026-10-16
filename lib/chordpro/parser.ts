import { parseChord } from '../chords';
import { ChordProSong, LicenseType, ParseResult } from './types';

const VALID_LICENSES: LicenseType[] = [
  'public_domain',
  'creative_commons',
  'original',
  'permission',
  'user_submitted',
];

/**
 * Tạo slug chuẩn URL từ tiêu đề (hỗ trợ tiếng Việt và tiếng Anh)
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Phân tích nội dung file ChordPro (.cho)
 * Kiểm tra tính hợp lệ của license và các thẻ hợp âm [Chord]
 */
export function parseChordPro(fileContent: string): ParseResult {
  const errors: string[] = [];
  const meta: Record<string, string> = {};
  const contentLines: string[] = [];

  const lines = fileContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Bắt các dòng chỉ thị: {tag: value} hoặc {tag:value}
    const directiveMatch = trimmed.match(/^\{\s*([a-zA-Z0-9_-]+)\s*:\s*(.*?)\s*\}$/);

    if (directiveMatch) {
      const key = directiveMatch[1].toLowerCase().replace('-', '_');
      const value = directiveMatch[2];
      meta[key] = value;
    } else {
      contentLines.push(line);
    }
  }

  // 1. Kiểm tra các trường bắt buộc
  if (!meta.title) errors.push('Thiếu trường tiêu đề: {title: ...}');
  if (!meta.artist) errors.push('Thiếu trường nghệ sĩ/tác giả: {artist: ...}');
  if (!meta.license) {
    errors.push('Thiếu trường giấy phép bản quyền: {license: public_domain|creative_commons|original|permission}');
  } else if (!VALID_LICENSES.includes(meta.license as LicenseType)) {
    errors.push(
      `Giấy phép không hợp lệ: "${meta.license}". Phải là một trong các giá trị: ${VALID_LICENSES.join(', ')}`
    );
  }

  // 2. Trích xuất và kiểm tra hợp âm
  const rawContent = contentLines.join('\n').trim();
  const chordMatches = Array.from(rawContent.matchAll(/\[([^\]]+)\]/g));
  const extractedChords = Array.from(new Set(chordMatches.map(m => m[1].trim())));

  const invalidChords: string[] = [];
  for (const chord of extractedChords) {
    if (!parseChord(chord)) {
      invalidChords.push(chord);
    }
  }

  if (invalidChords.length > 0) {
    errors.push(`Phát hiện hợp âm không hợp lệ: ${invalidChords.join(', ')}`);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const song: ChordProSong = {
    title: meta.title,
    artist: meta.artist,
    key: meta.key || 'C',
    rhythm: meta.rhythm,
    genre: meta.genre,
    license: meta.license as LicenseType,
    rightsHolder: meta.rights_holder || meta.rightsholder,
    source: meta.source,
    licenseNote: meta.license_note || meta.licensenote,
    content: rawContent,
    chords: extractedChords,
    slug: slugify(`${meta.title} ${meta.artist}`),
  };

  return { success: true, song };
}

