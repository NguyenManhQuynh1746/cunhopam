# Hướng dẫn Cấu hình Supabase cho Cunhopam

Tài liệu này hướng dẫn bạn từng bước thiết lập dự án Supabase miễn phí (Free Tier), cấu hình cơ sở dữ liệu, phân quyền Admin và chuẩn bị các khóa API cho Cunhopam.

---

## 1. Tạo Project Supabase miễn phí

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập (hoặc đăng ký tài khoản miễn phí bằng GitHub/Email).
2. Bấm **"New Project"**.
3. Điền các thông tin:
   - **Name**: `cunhopam`
   - **Database Password**: Đặt mật khẩu an toàn và lưu lại.
   - **Region**: Chọn khu vực gần Việt Nam nhất (khuyến nghị: `Singapore - ap-southeast-1`).
   - **Pricing Plan**: Chọn **Free** (hoàn toàn miễn phí).
4. Bấm **"Create new project"** và đợi khoảng 1-2 phút để Supabase khởi tạo.

---

## 2. Khởi tạo Cơ sở Dữ liệu & Row Level Security (RLS)

1. Ở menu bên trái trên trang quản trị Supabase, chọn mục **SQL Editor**.
2. Bấm **"New query"**.
3. Mở file [supabase/schema.sql](file:///c:/Users/pc/.antigravity/cunhopam/supabase/schema.sql) trong thư mục dự án, sao chép toàn bộ nội dung và dán vào ô SQL Editor.
4. Bấm nút **"Run"** (hoặc nhấn `Ctrl + Enter` / `Cmd + Enter`).
5. Bạn sẽ thấy thông báo `Success. No rows returned`. Tất cả các bảng (`profiles`, `songs`, `chords`, `artists`, `genres`, `rhythms`, `favorites`, `playlists`, `reports`...) và chính sách bảo mật RLS đã được kích hoạt thành công.

---

## 3. Lấy API Keys và cấu hình `.env.local`

1. Trên menu bên trái của Supabase, vào **Project Settings** (biểu tượng bánh răng ⚙️) -> chọn mục **API**.
2. Tại phần **Project API keys**, bạn sẽ thấy các thông tin:
   - **Project URL**: Sao chép giá trị này gán cho `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon / public key**: Sao chép giá trị này gán cho `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **service_role key** (Bấm *Reveal* để hiện): Sao chép giá trị này gán cho `SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ **LƯU Ý BẢO MẬT QUAN TRỌNG**:
> - `SUPABASE_SERVICE_ROLE_KEY` là khóa có toàn quyền quản trị, **chỉ dùng cho script import dữ liệu phía server**.
> - **KHÔNG BAO GIỜ** thêm tiền tố `NEXT_PUBLIC_` vào khóa này.
> - **KHÔNG BAO GIỜ** commit file `.env.local` lên GitHub.

Mở file [.env.local](file:///c:/Users/pc/.antigravity/cunhopam/.env.local) và điền các giá trị thực tế của bạn:

```env
# Bỏ qua kiểm tra swc lockfile trên Windows
NEXT_IGNORE_INCORRECT_LOCKFILE=1

# Supabase Client (Dùng cho cả trình duyệt và server)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role (CHỈ dùng cho script import / server task)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Cấu hình Xác thực (Authentication)

### A. Đăng nhập Email & Mật khẩu (Mặc định)
- Đăng nhập bằng Email và mật khẩu đã được bật sẵn theo mặc định trên Supabase.
- **Tắt yêu cầu xác nhận email khi test cục bộ (Tùy chọn)**:
  - Vào **Authentication** -> **Providers** -> **Email**.
  - Tắt mục *Confirm email* nếu bạn muốn tài khoản vừa đăng ký có thể đăng nhập ngay mà không cần kiểm tra hòm thư.

### B. Đăng nhập Google (OAuth)
*(Nếu chưa kịp tạo Google Client ID, bạn vẫn có thể sử dụng bình thường với Email & Mật khẩu).*

Nếu muốn bật nút **"Tiếp tục với Google"**:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) -> Tạo một Project mới.
2. Vào **APIs & Services** -> **Credentials** -> Bấm **Create Credentials** -> chọn **OAuth client ID**.
3. Chọn Application type: **Web application**.
4. Tại mục **Authorized redirect URIs**, thêm địa chỉ callback của Supabase:
   - Mở Supabase -> **Authentication** -> **Providers** -> **Google**.
   - Sao chép đường dẫn **Callback URL (for OAuth)** (dạng `https://<project-ref>.supabase.co/auth/v1/callback`) và dán vào Google Console.
5. Sao chép **Client ID** và **Client Secret** từ Google dán vào Supabase và bấm **Save**.
6. Thêm Redirect URLs cho Cunhopam:
   - Tại Supabase, vào **Authentication** -> **URL Configuration**.
   - Tại mục **Site URL**, điền `http://localhost:3000`.
   - Tại mục **Redirect URLs**, thêm:
     - `http://localhost:3000/auth/callback`
     - `https://<ten-mien-vercel-cua-ban>.vercel.app/auth/callback`

---

## 5. Đặt quyền Quản trị viên (Admin) cho tài khoản của bạn

Theo chính sách bảo mật RLS, người dùng thông thường không thể tự sửa cột `role` thành `admin`. Để nâng cấp tài khoản của bạn thành Admin:

1. Đăng ký tài khoản trên website (ví dụ email: `admin@cunhopam.com`).
2. Mở **SQL Editor** trên Supabase, chạy câu lệnh sau:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@cunhopam.com'
);
```

3. Vào lại trang [/profile](file:///c:/Users/pc/.antigravity/cunhopam/app/profile), bạn sẽ thấy huy hiệu **Quản trị viên (Admin)** màu vàng.

---

## 6. Chạy các Script Import Dữ liệu

Sau khi đã điền đầy đủ `.env.local`:

1. **Import kho hợp âm guitar từ `chords-db`**:
   ```bash
   npm run import:chords
   ```
   *Script sẽ đọc hơn 2.100 thế bấm hợp âm guitar và upsert vào bảng `chords` mà không lo bị trùng lặp.*

2. **Import bài hát mẫu ChordPro**:
   - Nhập bài ở trạng thái chờ duyệt (`is_verified = false`):
     ```bash
     npm run import:songs
     ```
   - Hoặc tự động duyệt các bài thuộc bản quyền công cộng (Public Domain):
     ```bash
     npm run import:songs -- --verify
     ```

Bây giờ bạn đã sẵn sàng trải nghiệm Cunhopam với cơ sở dữ liệu thật!

