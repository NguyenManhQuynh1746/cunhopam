export type SongLicenseType = 'original' | 'public_domain' | 'permission' | 'user_submitted';

export interface LicenseFormData {
  license_type: SongLicenseType;
  rights_holder?: string;
  source_url?: string;
  license_note?: string;
  terms_agreed: boolean;
}

export interface LicenseValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export const LICENSE_DESCRIPTIONS: Record<
  SongLicenseType,
  { label: string; description: string; badgeColor: string }
> = {
  original: {
    label: 'Tự sáng tác',
    description: 'Tác phẩm do chính bạn sáng tác giai điệu, lời hoặc chuyển soạn hợp âm độc quyền.',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  },
  public_domain: {
    label: 'Phạm vi công cộng (Public Domain)',
    description: 'Dân ca, nhạc truyền thống hoặc tác phẩm của tác giả đã qua đời trên 50 năm theo Luật SHTT.',
    badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  },
  permission: {
    label: 'Đã được cấp phép sử dụng',
    description: 'Bạn đã xin phép tác giả hoặc chủ sở hữu bản quyền để chia sẻ hợp âm bài hát này.',
    badgeColor: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  },
  user_submitted: {
    label: 'Đóng góp từ cộng đồng',
    description: 'Bài hát do cộng đồng yêu âm nhạc ký âm hợp âm phục vụ mục đích học tập và biểu diễn phi thương mại.',
    badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  },
};

/**
 * Kiểm tra tính hợp lệ của thông tin bản quyền và giấy phép khi đăng bài
 */
export function validateSongLicense(data: LicenseFormData): LicenseValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // 1. Phải chọn loại giấy phép
  if (!data.license_type) {
    errors.license_type = 'Vui lòng chọn loại giấy phép cho bài hát.';
  }

  // 2. Nếu là 'permission', bắt buộc phải có minh chứng (link hoặc ghi chú mô tả)
  if (data.license_type === 'permission') {
    const hasProof = (data.source_url && data.source_url.trim().length > 0) ||
                     (data.license_note && data.license_note.trim().length > 0);
    if (!hasProof) {
      errors.license_note = 'Đối với bài hát đã được cấp phép, vui lòng cung cấp đường dẫn minh chứng hoặc ghi chú văn bản cho phép.';
    }
  }

  // 3. Nếu là 'user_submitted', bắt buộc ghi rõ tác giả/chủ sở hữu gốc và đưa ra cảnh báo
  if (data.license_type === 'user_submitted') {
    if (!data.rights_holder || data.rights_holder.trim().length === 0) {
      errors.rights_holder = 'Vui lòng ghi rõ tên nhạc sĩ / chủ sở hữu quyền gốc của tác phẩm.';
    }
    warnings.push(
      'Bài hát đóng góp từ cộng đồng có thể bị gỡ bỏ ngay lập tức nếu chủ sở hữu quyền yêu cầu theo quy trình Notice & Takedown.'
    );
  }

  // 4. Bắt buộc tick chọn cam đoan bản quyền
  if (!data.terms_agreed) {
    errors.terms_agreed = 'Bạn cần xác nhận và cam đoan quyền đăng tải nội dung này.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

