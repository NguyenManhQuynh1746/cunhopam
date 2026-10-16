import React from 'react';
import { Metadata } from 'next';
import { FileText, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Điều khoản Dịch vụ | cunhopam',
  description: 'Điều khoản sử dụng dịch vụ và quy định cộng đồng cunhopam.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong>Lưu ý quan trọng:</strong> Đây là văn bản tóm tắt dự thảo nội bộ phục vụ quy trình thử nghiệm sản phẩm, cần luật sư rà soát trước khi triển khai chính thức.
        </div>
      </div>

      <div className="space-y-2 border-b border-line pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight flex items-center gap-3">
          <FileText className="w-9 h-9 text-accent" />
          <span>Điều khoản Sử dụng Dịch vụ</span>
        </h1>
        <p className="text-muted text-sm">
          Các điều khoản áp dụng đối với tất cả thành viên và khách truy cập website cunhopam.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-ink/90">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">1. Chấp thuận Điều khoản</h2>
          <p>
            Bằng việc đăng ký tài khoản hoặc sử dụng bất kỳ tính năng nào của cunhopam, bạn đồng ý tuân thủ toàn bộ các điều khoản và quy định cộng đồng được nêu tại đây.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">2. Trách nhiệm của Thành viên khi Đăng bài</h2>
          <p>
            Thành viên tự chịu trách nhiệm hoàn toàn về tính chính xác, nguồn gốc hợp pháp và bản quyền của nội dung do mình tải lên. Bạn cam kết không đăng tải:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li>Nội dung xâm phạm quyền sở hữu trí tuệ của bên thứ ba mà không có sự cho phép hợp pháp.</li>
            <li>Nội dung có chứa từ ngữ khiếm nhã, thù địch, xúc phạm danh dự cá nhân hoặc tổ chức.</li>
            <li>Mã độc, spam hoặc can thiệp trái phép vào hệ thống kỹ thuật của cunhopam.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">3. Quyền của Ban Quản trị</h2>
          <p>
            Ban quản trị có quyền kiểm duyệt, từ chối, ẩn hoặc gỡ bỏ bất kỳ bài hát, bình luận nào không đáp ứng tiêu chuẩn cộng đồng mà không cần báo trước. Tài khoản có hành vi gian lận hoặc vi phạm có thể bị khoá vĩnh viễn.
          </p>
        </section>
      </div>
    </div>
  );
}

