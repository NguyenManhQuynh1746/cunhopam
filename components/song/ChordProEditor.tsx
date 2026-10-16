'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { parseChordLyrics, RenderedLine } from '@/lib/chordpro/renderer';
import { validateChordPro, ChordError } from '@/lib/chordpro/validator';
import {
  SongLicenseType,
  LICENSE_DESCRIPTIONS,
  LicenseFormData,
} from '@/lib/songs/license';
import {
  Sparkles,
  AlertCircle,
  Eye,
  Edit3,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Save,
  RotateCcw,
} from 'lucide-react';

const COMMON_CHORDS = [
  'C', 'Am', 'F', 'G', 'Em', 'Dm', 'D', 'A', 'E',
  'Bm', 'Bb', 'C7', 'G7', 'D7', 'A7', 'E7', 'F#m', 'B7', 'Dsus4', 'Fmaj7',
];

interface ChordProEditorProps {
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    title: string;
    artist_name?: string;
    key: string;
    content: string;
    rhythm_name?: string;
    genre_name?: string;
    license_type?: SongLicenseType;
    rights_holder?: string;
    source_url?: string;
    license_note?: string;
    is_verified?: boolean;
    slug?: string;
  };
  onSubmit: (data: {
    title: string;
    artist_name: string;
    key: string;
    content: string;
    rhythm_name?: string;
    genre_name?: string;
    license: LicenseFormData;
    reason?: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
}

export default function ChordProEditor({
  mode,
  initialData,
  onSubmit,
}: ChordProEditorProps) {
  const router = useRouter();

  // Form Fields
  const [title, setTitle] = useState(initialData?.title || '');
  const [artistName, setArtistName] = useState(initialData?.artist_name || '');
  const [key, setKey] = useState(initialData?.key || 'C');
  const [content, setContent] = useState(initialData?.content || '');
  const [rhythmName, setRhythmName] = useState(initialData?.rhythm_name || '');
  const [genreName, setGenreName] = useState(initialData?.genre_name || '');

  // Edit Mode Specifics
  const [editReason, setEditReason] = useState('');

  // License Fields
  const [licenseType, setLicenseType] = useState<SongLicenseType>(
    initialData?.license_type || 'user_submitted'
  );
  const [rightsHolder, setRightsHolder] = useState(initialData?.rights_holder || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url || '');
  const [licenseNote, setLicenseNote] = useState(initialData?.license_note || '');
  const [termsAgreed, setTermsAgreed] = useState(mode === 'edit');

  // UI States
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Phục hồi bản nháp từ localStorage (chỉ chạy ở phía client sau khi mount để tránh SSR mismatch)
  useEffect(() => {
    if (mode === 'create' && typeof window !== 'undefined') {
      try {
        const savedDraft = localStorage.getItem('cunhopam_draft_song');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.content && !content) {
            setTitle(parsed.title || '');
            setArtistName(parsed.artist_name || '');
            setKey(parsed.key || 'C');
            setContent(parsed.content || '');
            setRhythmName(parsed.rhythm_name || '');
            setGenreName(parsed.genre_name || '');
            setIsDraftRestored(true);
          }
        }
      } catch (e) {
        console.warn('Lỗi đọc draft:', e);
      }
    }
  }, [mode]);

  // 2. Tự động lưu nháp vào localStorage khi soạn thảo (đối với mode create)
  useEffect(() => {
    if (mode === 'create' && typeof window !== 'undefined' && (title || content)) {
      setIsDirty(true);
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(
            'cunhopam_draft_song',
            JSON.stringify({
              title,
              artist_name: artistName,
              key,
              content,
              rhythm_name: rhythmName,
              genre_name: genreName,
              savedAt: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.warn('Lỗi lưu draft:', e);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mode, title, artistName, key, content, rhythmName, genreName]);

  // 3. Cảnh báo trước khi rời trang nếu chưa lưu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 4. Validate ChordPro trong thời gian thực
  const validation = useMemo(() => {
    return validateChordPro(content);
  }, [content]);

  // 5. Parse ChordPro thành cấu trúc dòng cho Live Preview
  const renderedLines: RenderedLine[] = useMemo(() => {
    return parseChordLyrics(content);
  }, [content]);

  // Chèn hợp âm vào vị trí con trỏ trong textarea
  const insertChord = (chordToInsert: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tag = `[${chordToInsert}]`;

    const newContent = content.substring(0, start) + tag + content.substring(end);
    setContent(newContent);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleClearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cunhopam_draft_song');
      setTitle('');
      setArtistName('');
      setContent('');
      setKey('C');
      setIsDraftRestored(false);
      setIsDirty(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setServerSuccess(null);

    if (!title.trim()) {
      setServerError('Vui lòng nhập tên bài hát.');
      return;
    }
    if (!artistName.trim()) {
      setServerError('Vui lòng nhập tên ca sĩ hoặc nhạc sĩ.');
      return;
    }
    if (!content.trim()) {
      setServerError('Vui lòng nhập nội dung bài hát kèm hợp âm.');
      return;
    }

    if (!validation.isValid) {
      setServerError(`Bài hát có ${validation.errors.length} lỗi hợp âm. Vui lòng sửa trước khi gửi.`);
      return;
    }

    if (!termsAgreed) {
      setServerError('Bạn cần tích chọn xác nhận cam đoan quyền đăng tải bài hát.');
      return;
    }

    setLoading(true);

    const licenseData: LicenseFormData = {
      license_type: licenseType,
      rights_holder: rightsHolder,
      source_url: sourceUrl,
      license_note: licenseNote,
      terms_agreed: termsAgreed,
    };

    const res = await onSubmit({
      title,
      artist_name: artistName,
      key,
      content,
      rhythm_name: rhythmName,
      genre_name: genreName,
      license: licenseData,
      reason: editReason,
    });

    setLoading(false);

    if (!res.success) {
      setServerError(res.error || 'Có lỗi xảy ra khi lưu bài hát.');
    } else {
      setIsDirty(false);
      if (mode === 'create' && typeof window !== 'undefined') {
        localStorage.removeItem('cunhopam_draft_song');
      }
      setServerSuccess(res.message || (mode === 'create' ? 'Đăng bài thành công! Đang chuyển hướng...' : 'Đã cập nhật bài hát!'));
      setTimeout(() => {
        router.push('/bai-cua-toi');
      }, 1500);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Thông báo bản nháp được phục hồi */}
      {isDraftRestored && (
        <div className="p-3.5 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Đã tự động khôi phục bản nháp chưa lưu từ trình duyệt của bạn.</span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-xs font-semibold text-muted hover:text-rose-600 transition"
          >
            Xoá bản nháp
          </button>
        </div>
      )}

      {/* Thông báo lỗi & thành công */}
      {serverError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {serverSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{serverSuccess}</span>
        </div>
      )}

      {/* 1. Thông tin cơ bản của bài hát */}
      <section className="bg-surface border border-line rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-ink">Thông tin bài hát</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Tên bài hát <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Diễm xưa"
              className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Nghệ sĩ / Ca sĩ thể hiện <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Ví dụ: Trịnh Công Sơn / Khánh Ly"
              className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Tông gốc (Key) <span className="text-rose-500">*</span>
            </label>
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-bg border border-line rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono font-bold"
            >
              {['C', 'Am', 'G', 'Em', 'D', 'Bm', 'F', 'Dm', 'A', 'F#m', 'E', 'C#m', 'Bb', 'Gm', 'Eb', 'Cm', 'Ab', 'Fm', 'B', 'G#m'].map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Điệu nhạc (Rhythm)
            </label>
            <input
              type="text"
              value={rhythmName}
              onChange={(e) => setRhythmName(e.target.value)}
              placeholder="Ví dụ: Ballad, Boston, Slow Rock"
              className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Thể loại (Genre)
            </label>
            <input
              type="text"
              value={genreName}
              onChange={(e) => setGenreName(e.target.value)}
              placeholder="Ví dụ: Nhạc trữ tình, Nhạc Trịnh, Pop Ballad"
              className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {mode === 'edit' && (
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Lý do chỉnh sửa (Lưu vào nhật ký phiên bản)
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Ví dụ: Bổ sung hợp âm điệp khúc, sửa lỗi chính tả lời..."
              className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}
      </section>

      {/* 2. Trình soạn thảo ChordPro & Live Preview */}
      <section className="bg-surface border border-line rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Lời bài hát & Hợp âm (ChordPro)</h2>
            <p className="text-xs text-muted">
              Gõ lời bình thường và chèn hợp âm trong ngoặc vuông ngay trước từ tương ứng: <code>[Am]Mưa vẫn [Dm]mưa bay...</code>
            </p>
          </div>

          <div className="flex items-center gap-1 bg-bg p-1 rounded-xl border border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 rounded-lg transition ${activeTab === 'editor' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'}`}
            >
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>Soạn thảo</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded-lg transition ${activeTab === 'preview' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'}`}
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Xem trước</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`hidden md:inline-flex px-2.5 py-1 rounded-lg transition ${activeTab === 'split' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'}`}
            >
              <span>Song song (2 cột)</span>
            </button>
          </div>
        </div>

        {/* Thanh công cụ chèn nhanh hợp âm */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-muted text-[11px] shrink-0 mr-1">Chèn nhanh:</span>
          {COMMON_CHORDS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => insertChord(c)}
              className="px-2 py-0.5 rounded-lg bg-bg border border-line hover:border-accent hover:text-accent font-bold font-mono text-ink transition shrink-0 active:scale-95"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Cảnh báo lỗi hợp âm thời gian thực */}
        {!validation.isValid && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Phát hiện hợp âm không hợp lệ ({validation.errors.length} lỗi):</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {validation.errors.slice(0, 5).map((err, idx) => (
                <li key={idx}>{err.message}</li>
              ))}
              {validation.errors.length > 5 && (
                <li>... và {validation.errors.length - 5} lỗi khác</li>
              )}
            </ul>
          </div>
        )}

        {/* Khung Soạn thảo & Xem trước */}
        <div className={`grid gap-5 ${activeTab === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Cột Trái: Textarea Soạn thảo */}
          {(activeTab === 'editor' || activeTab === 'split') && (
            <div className="space-y-1.5">
              <textarea
                ref={textareaRef}
                required
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="[Am]Mưa vẫn mưa bay trên tầng tháp [Dm]cổ&#10;Dài tay em [G]mấy thuở mắt xanh [C]xao..."
                className="w-full bg-bg border border-line rounded-2xl p-4 font-mono text-sm leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-accent select-text"
              />
              <div className="flex items-center justify-between text-[11px] text-muted px-1">
                <span>Số ký tự: {content.length} / 20.000</span>
                <span>Số hợp âm trích xuất: {validation.chords.length}</span>
              </div>
            </div>
          )}

          {/* Cột Phải: Live Preview */}
          {(activeTab === 'preview' || activeTab === 'split') && (
            <div className="rounded-2xl border border-line bg-bg p-4 sm:p-6 overflow-y-auto max-h-[500px]">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Bản xem trước trực tiếp (Live Preview)
              </div>
              <div className="space-y-3 font-sans text-sm select-text">
                {renderedLines.length === 0 ? (
                  <p className="text-muted text-xs italic">Nội dung xem trước sẽ hiển thị ở đây...</p>
                ) : (
                  renderedLines.map((line, lIdx) => {
                    if (line.type === 'empty') return <div key={lIdx} className="h-3" />;
                    if (line.type === 'comment') {
                      return (
                        <div key={lIdx} className="font-semibold text-xs text-accent uppercase tracking-wider">
                          [{line.comment}]
                        </div>
                      );
                    }
                    return (
                      <div key={lIdx} className="flex flex-wrap items-end leading-none py-0.5">
                        {line.segments?.map((seg, sIdx) => (
                          <span key={sIdx} className="inline-flex flex-col items-start pr-0.5">
                            {seg.chord ? (
                              <span className="font-bold text-accent text-[0.88em] leading-tight pb-0.5 font-mono select-none">
                                {seg.chord}
                              </span>
                            ) : (
                              <span className="h-[1em] leading-tight select-none opacity-0">&nbsp;</span>
                            )}
                            <span className="text-ink whitespace-pre font-normal leading-normal">
                              {seg.text || ' '}
                            </span>
                          </span>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Nguồn gốc & Bản quyền (Bắt buộc theo Pháp lý) */}
      <section className="bg-surface border border-line rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-ink">Nguồn gốc & Giấy phép Bản quyền</h2>
          <p className="text-xs text-muted">
            Theo quy định pháp luật sở hữu trí tuệ, bạn cần minh bạch nguồn gốc bản quyền của bài hát này.
          </p>
        </div>

        {/* Lựa chọn loại giấy phép */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(LICENSE_DESCRIPTIONS) as SongLicenseType[]).map((type) => {
            const info = LICENSE_DESCRIPTIONS[type];
            const isSelected = licenseType === type;
            return (
              <label
                key={type}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-line bg-bg hover:border-line-hover'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="license_type"
                      value={type}
                      checked={isSelected}
                      onChange={() => setLicenseType(type)}
                      className="text-accent focus:ring-accent"
                    />
                    <span className="font-bold text-sm text-ink">{info.label}</span>
                  </div>
                </div>
                <p className="text-xs text-muted pl-6">{info.description}</p>
              </label>
            );
          })}
        </div>

        {/* Trường nhập liệu bổ sung tùy theo loại giấy phép */}
        <div className="space-y-3 pt-2 border-t border-line">
          {licenseType === 'user_submitted' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý bản quyền:</strong> Bài hát đóng góp từ cộng đồng bắt buộc phải ghi rõ tên tác giả / chủ sở hữu gốc. Bài hát sẽ bị gỡ bỏ ngay khi có khiếu nại bản quyền hợp pháp.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Chủ sở hữu quyền / Tác giả gốc {licenseType === 'user_submitted' && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                required={licenseType === 'user_submitted'}
                value={rightsHolder}
                onChange={(e) => setRightsHolder(e.target.value)}
                placeholder="Ví dụ: Nhạc sĩ Trịnh Công Sơn"
                className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Đường dẫn tư liệu nguồn (Source URL) {licenseType === 'permission' && '(Bắt buộc nếu không có ghi chú)'}
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {licenseType === 'permission' && (
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Ghi chú giấy phép / Minh chứng cấp quyền <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={licenseNote}
                onChange={(e) => setLicenseNote(e.target.value)}
                placeholder="Mô tả văn bản hoặc thoả thuận cho phép sử dụng..."
                className="w-full bg-bg border border-line rounded-xl px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          {/* Checkbox cam đoan bản quyền bắt buộc */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 rounded text-accent focus:ring-accent"
              />
              <span className="text-xs text-ink">
                Tôi cam đoan rằng tôi có quyền hợp pháp đăng tải nội dung này hoặc nội dung thuộc phạm vi công cộng / chia sẻ hợp pháp, và hoàn toàn chịu trách nhiệm theo{' '}
                <a href="/ban-quyen" target="_blank" className="text-accent underline font-semibold">Chính sách bản quyền</a> và{' '}
                <a href="/dieu-khoan" target="_blank" className="text-accent underline font-semibold">Điều khoản sử dụng</a>.
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Nút gửi bài */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-full border border-line bg-surface text-ink text-sm font-semibold hover:bg-soft transition"
        >
          Huỷ bỏ
        </button>

        <button
          type="submit"
          disabled={loading || !validation.isValid || !termsAgreed}
          className="px-6 py-2.5 rounded-full bg-accent hover:bg-accent-dark text-ai text-sm font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Đang xử lý...' : mode === 'create' ? 'Gửi bài để kiểm duyệt' : 'Cập nhật bài hát'}</span>
        </button>
      </div>
    </form>
  );
}

