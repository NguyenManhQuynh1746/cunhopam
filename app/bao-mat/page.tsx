import React from 'react';
import { Metadata } from 'next';
import { Lock, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính sách Quyền riêng tư & Bảo mật | cunhopam',
  description: 'Chính sách bảo mật thông tin cá nhân và dữ liệu người dùng tại cunhopam.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong>Lưu ý quan trọng:</strong> Đây là bản tóm tắt chính sách quyền riêng tư dự thảo phục vụ vận hành kỹ thuật.
        </div>
      </div>

      <div className="space-y-2 border-b border-line pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight flex items-center gap-3">
          <Lock className="w-9 h-9 text-accent" />
          <span>Chính sách Bảo mật Thông tin</span>
        </h1>
        <p className="text-muted text-sm">
          Cunhopam cam kết bảo vệ dữ liệu cá nhân và sự an toàn riêng tư của bạn.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-ink/90">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">1. Thu thập Thông tin</h2>
          <p>
            Chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết để phục vụ trải nghiệm người dùng, bao gồm:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li>Email và tên đại diện khi bạn đăng ký tài khoản hoặc đăng nhập Google OAuth.</li>
            <li>Dữ liệu bài hát đã lưu, playlist cá nhân và danh sách hợp âm bạn đã biết để đồng bộ trên các thiết bị.</li>
            <li>Thông tin kỹ thuật ẩn danh (IP băm bảo mật một chiều) để đếm lượt xem bài hát chống spam và bảo vệ hệ thống.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">2. Sử dụng và Bảo vệ Dữ liệu</h2>
          <p>
            Cunhopam <strong>không bán, chia sẻ hoặc thương mại hoá</strong> thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích quảng cáo. Dữ liệu tài khoản được mã hoá và bảo vệ bằng công nghệ bảo mật tiêu chuẩn ngành qua Supabase (PostgreSQL RLS).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-ink">3. Quyền của Người dùng</h2>
          <p>
            Bạn có toàn quyền xem, chỉnh sửa thông tin hồ sơ cá nhân hoặc yêu cầu xoá tài khoản và toàn bộ dữ liệu liên quan bất kỳ lúc nào bằng cách liên hệ với ban quản trị.
          </p>
        </section>
      </div>
    </div>
  );
}

