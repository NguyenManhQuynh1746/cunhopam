/**
 * Chuyển đổi hai chiều giữa tên hợp âm và URL Slug chuẩn
 * Quy ước:
 * - Dấu thăng (#) -> "-thang"
 * - Dấu giáng (b) -> "-giang"
 * - Nốt bass (/) -> "-tren-"
 * Ví dụ:
 * - C# -> c-thang
 * - Bb -> b-giang
 * - C#m7 -> c-thang-m7
 * - Bbm7 -> b-giang-m7
 * - F#m7 -> f-thang-m7
 * - Am -> am
 * - C/G -> c-tren-g
 */

export function chordToSlug(chord: string): string {
  if (!chord) return '';
  const trimmed = chord.trim();

  // Tách bass nếu có
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx !== -1) {
    const main = trimmed.slice(0, slashIdx);
    const bass = trimmed.slice(slashIdx + 1);
    return `${chordToSlug(main)}-tren-${chordToSlug(bass)}`;
  }

  // Tách nốt gốc và hậu tố
  const match = trimmed.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) {
    return trimmed.toLowerCase().replace(/#/g, '-thang').replace(/b/g, '-giang');
  }

  const root = match[1];
  const suffix = match[2];

  let slugRoot = root.toLowerCase();
  if (slugRoot.endsWith('#')) {
    slugRoot = slugRoot.slice(0, -1) + '-thang';
  } else if (slugRoot.endsWith('b')) {
    slugRoot = slugRoot.slice(0, -1) + '-giang';
  }

  const slugSuffix = suffix.toLowerCase();
  if (!slugSuffix) return slugRoot;

  // Nếu nốt gốc có thăng/giáng (-thang, -giang) thì nối dấu gạch ngang: c-thang-m7
  // Nếu nốt tự nhiên thì viết liền: am, am7, g7, cmaj7
  if (slugRoot.endsWith('-thang') || slugRoot.endsWith('-giang')) {
    return `${slugRoot}-${slugSuffix}`.replace(/--+/g, '-');
  }

  return `${slugRoot}${slugSuffix}`;
}

export function slugToChord(slug: string): string | null {
  if (!slug) return null;
  const trimmed = slug.trim().toLowerCase();

  // Xử lý nốt bass nếu có
  if (trimmed.includes('-tren-')) {
    const [mainSlug, bassSlug] = trimmed.split('-tren-');
    const mainChord = slugToChord(mainSlug);
    const bassChord = slugToChord(bassSlug);
    if (mainChord && bassChord) {
      return `${mainChord}/${bassChord}`;
    }
    return null;
  }

  // Kiểm tra nốt thăng (-thang)
  const thangMatch = trimmed.match(/^([a-g])-thang(?:-(.*))?$/);
  if (thangMatch) {
    const note = thangMatch[1].toUpperCase() + '#';
    const suffix = thangMatch[2] || '';
    return `${note}${suffix}`;
  }

  // Kiểm tra nốt giáng (-giang)
  const giangMatch = trimmed.match(/^([a-g])-giang(?:-(.*))?$/);
  if (giangMatch) {
    const note = giangMatch[1].toUpperCase() + 'b';
    const suffix = giangMatch[2] || '';
    return `${note}${suffix}`;
  }

  // Nốt tự nhiên không thăng/giáng (vd: "am", "am7", "c", "d-sus4", "dsus4")
  const naturalMatch = trimmed.match(/^([a-g])(?:-)?(.*)$/);
  if (naturalMatch) {
    const note = naturalMatch[1].toUpperCase();
    const suffix = naturalMatch[2] || '';
    return `${note}${suffix}`;
  }

  return null;
}
