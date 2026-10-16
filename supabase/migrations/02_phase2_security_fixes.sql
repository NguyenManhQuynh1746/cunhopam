-- ==============================================================================
-- CUNHOPAM - GIAI ĐOẠN 2: BẢO MẬT & ĐIỀU CHỈNH CHÍNH SÁCH
-- ==============================================================================

-- 1. ĐẢM BẢO CHỈ SERVICE_ROLE ĐƯỢC PHÉP GỌI RECORD_SONG_VIEW
-- Thu hồi quyền từ public, anon, authenticated và cấp quyền rõ ràng cho service_role
revoke all on function public.record_song_view(uuid, text) from public;
revoke all on function public.record_song_view(uuid, text) from anon;
revoke all on function public.record_song_view(uuid, text) from authenticated;
grant execute on function public.record_song_view(uuid, text) to service_role;

-- 2. ĐẢM BẢO CHÍNH SÁCH INSERT CỦA COMMENTS BẮT BUỘC USER_ID = AUTH.UID()
alter table public.comments enable row level security;

drop policy if exists "Đăng bình luận" on public.comments;
create policy "Đăng bình luận" on public.comments
  for insert with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Xoá bình luận của mình hoặc admin" on public.comments;
create policy "Xoá bình luận của mình hoặc admin" on public.comments
  for delete using (auth.uid() = user_id or public.is_admin());

-- 3. BỔ SUNG CỘT IP_ADDRESS CHO BẢNG REPORTS (Kiểm toán khiếu nại công khai)
alter table public.reports add column if not exists ip_address text;
