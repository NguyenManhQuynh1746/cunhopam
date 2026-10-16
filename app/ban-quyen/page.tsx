import React from 'react';
import { Metadata } from 'next';
import { ShieldCheck, Mail, AlertTriangle, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách Bản quyền & Sở hữu Trí tuệ | cunhopam',
  description: 'Quy định bản quyền, quy trình thông báo khiếu nại và gỡ bài (Notice & Takedown) của cunhopam.',
};

export default function CopyrightPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'lienhe@example.com';

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Banner ghi chú bản nháp */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong>Lưu ý quan trọng:</strong> Đây là văn bản quy định dự thảo phục vụ vận hành kỹ thuật. Cần được người có chuyên môn am hiểu pháp luật rà soát và hoàn thiện trước khi áp dụng thương mại chính thức.
        </div>
      </div>

      <div className="space-y-2 border-b border-line pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-9 h-9 text-emerald-500" />
          <span>Chính sách Bản quyền & Gỡ bỏ nội dung</span>
        </h1>
        <p className="text-muted text-sm">
          Cunhopam tôn trọng tuyệt đối quyền tác giả và quyền sở hữu trí tuệ theo quy định của pháp luật Việt Nam và chuẩn mực quốc tế.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-ink/90">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">1. Tôn chỉ và Bản chất Dịch vụ</h2>
          <p>
            Cunhopam là nền tảng thư viện hợp âm và hỗ trợ tập luyện âm nhạc phi thương mại. Nội dung chia sẻ trên hệ thống chủ yếu là <strong>hệ thống ký âm hợp âm</strong> do cộng đồng người chơi nhạc tự chuyển soạn hoặc bài hát thuộc phạm vi công cộng nhằm mục đích học tập, giảng dạy và nghiên cứu cá nhân.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">2. Phân loại Giấy phép khi Đăng bài</h2>
          <p>Mọi thành viên khi đăng tải bài hát lên hệ thống đều phải minh bạch về nguồn gốc và loại giấy phép:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li><strong className="text-ink">Tự sáng tác (Original):</strong> Do chính thành viên sáng tác giai điệu, lời hoặc chuyển soạn hợp âm độc quyền.</li>
            <li><strong className="text-ink">Phạm vi công cộng (Public Domain):</strong> Dân ca truyền thống hoặc tác phẩm của tác giả đã qua đời trên 50 năm theo Luật SHTT.</li>
            <li><strong className="text-ink">Đã được cấp phép (Permission):</strong> Thành viên đã có sự đồng ý bằng văn bản hoặc uỷ quyền của chủ sở hữu bản quyền.</li>
            <li><strong className="text-ink">Đóng góp từ cộng đồng (User-submitted):</strong> Ký âm phục vụ mục đích học tập, bắt buộc ghi rõ tác giả gốc và cam đoan quyền chia sẻ.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">3. Quy trình Thông báo và Gỡ bỏ (Notice & Takedown)</h2>
          <p>
            Nếu bạn là tác giả, nhạc sĩ, nghệ sĩ hoặc chủ sở hữu bản quyền hợp pháp của bất kỳ bài hát nào trên cunhopam và muốn yêu cầu gỡ bỏ hoặc cập nhật thông tin tác quyền, vui lòng gửi yêu cầu cho chúng tôi:
          </p>
          <div className="p-4 rounded-2xl bg-surface border border-line space-y-2">
            <div className="flex items-center gap-2 font-semibold text-accent">
              <Mail className="w-4 h-4" />
              <span>Email tiếp nhận khiếu nại bản quyền:</span>
            </div>
            <div className="font-mono font-bold text-ink text-base">
              {contactEmail}
            </div>
            <p className="text-xs text-muted">
              (Hoặc bấm nút <strong>"Báo lỗi / Khiếu nại bản quyền"</strong> trực tiếp ở cuối mỗi trang bài hát).
            </p>
          </div>
          <p>
            Đơn khiếu nại vui lòng cung cấp: (1) Đường dẫn bài hát trên cunhopam; (2) Giấy tờ hoặc căn cứ chứng minh quyền sở hữu hợp pháp; (3) Yêu cầu cụ thể (gỡ bỏ nội dung hoặc bổ sung thông tin quyền tác giả).
          </p>
          <p>
            Ban quản trị cam kết sẽ tiếp nhận, xác minh và xử lý gỡ bỏ bài hát ngay <em>trong thời gian sớm nhất</em> sau khi nhận được yêu cầu hợp lệ.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">4. Xử lý Vi phạm nhiều lần (Repeat Infringers)</h2>
          <p>
            Cunhopam áp dụng chính sách xử lý nghiêm khắc đối với các tài khoản cố tình đăng tải nội dung vi phạm bản quyền nhiều lần hoặc cung cấp thông tin sai lệch: bài hát sẽ bị xoá vĩnh viễn và tài khoản người dùng sẽ bị khoá quyền đăng bài.
          </p>
        </section>
      </div>
    </div>
  );
}

