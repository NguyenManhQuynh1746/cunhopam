# cunhopam – Thư viện hợp âm guitar dành cho người Việt

Website thư viện hợp âm guitar đầy đủ chức năng: tra bài hát có hợp âm chuẩn, đổi tông theo giọng ca, hiển thị sơ đồ ngón bấm phím đàn, nghe thử âm thanh, quản lý playlist cá nhân và tham gia đóng góp bài hát.

---

## 🛠 Công nghệ sử dụng
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, Auth, Storage)
- **Kiểm thử**: Vitest
- **Kho hợp âm**: `@tombatossals/chords-db` (Giấy phép MIT)
- **Định dạng bài hát**: Chuẩn ChordPro (`.cho`)

---

## 🚀 Khởi chạy dự án

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Cấu hình biến môi trường
Tạo file `.env.local` theo mẫu [.env.local.example](.env.local.example):
```env
NEXT_IGNORE_INCORRECT_LOCKFILE=1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
Xem hướng dẫn chi tiết từng bước tạo project và lấy khóa tại [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

### 3. Chạy kiểm thử (Unit Tests)
```bash
npm test
```

### 4. Import dữ liệu hợp âm và bài hát mẫu
```bash
# Import hơn 2.100 thế bấm hợp âm guitar từ chords-db vào Supabase
npm run import:chords

# Import các bài hát mẫu ChordPro (Amazing Grace, Auld Lang Syne, Greensleeves)
npm run import:songs

# Hoặc tự động duyệt các bài thuộc phạm vi công cộng (Public Domain):
npm run import:songs -- --verify
```

### 5. Khởi chạy Development Server
```bash
npm run dev
```
Mở trình duyệt truy cập: `http://localhost:3000`.

---

## 📜 Giấy phép & Bản quyền nguồn dữ liệu (Third-Party Licenses)

Dự án sử dụng cơ sở dữ liệu hợp âm guitar mã nguồn mở từ:
- **Thư viện**: [`@tombatossals/chords-db`](https://github.com/tombatossals/chords-db)
- **Tác giả**: David Rubert (Copyright © 2016)
- **Giấy phép**: **MIT License** (được xác thực trực tiếp từ file `LICENSE` của thư viện).
- **Quy định nội dung bài hát**: Cunhopam tuân thủ nghiêm ngặt quyền sở hữu trí tuệ, **không crawl/scrape** từ các website khác. Mọi bài hát mẫu đi kèm đều thuộc phạm vi công cộng (Public Domain) với nguồn gốc rõ ràng.
