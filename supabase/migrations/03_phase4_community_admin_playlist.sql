-- ==============================================================================
-- CUNHOPAM - GIAI ĐOẠN 4: COMMUNITY, ADMIN, PLAYLIST & GOVERNANCE
-- Migration 03_phase4_community_admin_playlist.sql
-- ==============================================================================

-- 1. BỔ SUNG ENUM & CỘT CHO BẢNG HIỆN CÓ
alter type public.report_status add value if not exists 'open';
alter type public.report_status add value if not exists 'reviewing';

-- Bổ sung cột cho bảng profiles (khoá tài khoản)
alter table public.profiles add column if not exists is_banned boolean default false not null;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_at timestamptz;

-- Bổ sung cột cho bảng songs (cam đoan bản quyền & lý do từ chối)
alter table public.songs add column if not exists rejection_reason text;
alter table public.songs add column if not exists terms_agreed_at timestamptz;
alter table public.songs add column if not exists terms_agreed_by uuid references auth.users(id);

-- Bổ sung cột cho bảng comments (ẩn bình luận)
alter table public.comments add column if not exists is_hidden boolean default false not null;

-- Bổ sung cột cho bảng reports (người xử lý, ghi chú admin)
alter table public.reports add column if not exists resolved_by uuid references auth.users(id) on delete set null;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists admin_note text;

-- 2. BẢNG SONG_REVISIONS (Lịch sử phiên bản & Sửa bài đã duyệt)
create table if not exists public.song_revisions (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade not null,
  revised_by uuid references auth.users(id) on delete set null not null,
  title text not null,
  key text not null,
  content text not null,
  chords text[] default array[]::text[],
  reason text,
  status text default 'pending' not null check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_song_revisions_song on public.song_revisions (song_id, created_at desc);
create index if not exists idx_song_revisions_status on public.song_revisions (status);

-- 3. BẢNG SONG_REQUESTS & SONG_REQUEST_VOTES (Yêu cầu hợp âm & Bình chọn)
create table if not exists public.song_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  artist_name text not null,
  note text,
  status text default 'pending' not null check (status in ('pending', 'fulfilled', 'rejected')),
  fulfilled_song_id uuid references public.songs(id) on delete set null,
  votes_count integer default 0 not null check (votes_count >= 0),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_song_requests_votes on public.song_requests (votes_count desc, created_at desc);
create index if not exists idx_song_requests_user on public.song_requests (user_id);

create table if not exists public.song_request_votes (
  user_id uuid references auth.users(id) on delete cascade not null,
  request_id uuid references public.song_requests(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (user_id, request_id)
);

create index if not exists idx_song_request_votes_req on public.song_request_votes (request_id);

-- 4. BẢNG ADMIN_LOGS (Nhật ký thao tác quản trị)
create table if not exists public.admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users(id) on delete set null not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_admin_logs_created on public.admin_logs (created_at desc);

-- 5. TRIGGER BẢO VỆ DỮ LIỆU & RÀNG BUỘC TOÀN VẸN

-- 5.1. Chặn người dùng tự thay đổi profiles.role
drop trigger if exists on_profile_role_update on public.profiles;

create or replace function public.trg_protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Người dùng không được phép tự sửa quyền tài khoản (role).';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.trg_protect_profile_role();

-- 5.2. Chặn tác giả tự duyệt bài hoặc sửa các cột nhạy cảm khi UPDATE
create or replace function public.trg_protect_song_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then
    new.is_verified := old.is_verified;
    new.takedown_status := old.takedown_status;
    new.rejection_reason := old.rejection_reason;
    new.published_at := old.published_at;
    new.view_count := old.view_count;
    new.created_by := old.created_by;
    new.slug := old.slug; -- Không cho đổi slug sau khi đăng
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_song_fields on public.songs;
create trigger trg_protect_song_fields
  before update on public.songs
  for each row execute function public.trg_protect_song_protected_fields();

-- 5.3. Chặn tài khoản bị khoá (is_banned = true) thực hiện tạo nội dung mới
create or replace function public.trg_check_user_not_banned()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and is_banned = true
  ) then
    raise exception 'Tài khoản của bạn đã bị tạm khoá do vi phạm tiêu chuẩn cộng đồng.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_banned_songs on public.songs;
create trigger trg_banned_songs
  before insert on public.songs
  for each row execute function public.trg_check_user_not_banned();

drop trigger if exists trg_banned_comments on public.comments;
create trigger trg_banned_comments
  before insert on public.comments
  for each row execute function public.trg_check_user_not_banned();

drop trigger if exists trg_banned_requests on public.song_requests;
create trigger trg_banned_requests
  before insert on public.song_requests
  for each row execute function public.trg_check_user_not_banned();

drop trigger if exists trg_banned_votes on public.song_request_votes;
create trigger trg_banned_votes
  before insert on public.song_request_votes
  for each row execute function public.trg_check_user_not_banned();

drop trigger if exists trg_banned_playlists on public.playlists;
create trigger trg_banned_playlists
  before insert on public.playlists
  for each row execute function public.trg_check_user_not_banned();

-- 5.4. Giới hạn 5 bài đăng trong 24h & kiểm tra độ dài bài hát
create or replace function public.trg_check_song_limits()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_count int;
begin
  -- Kiểm tra độ dài tiêu đề và nội dung
  if length(new.title) > 255 then
    raise exception 'Tiêu đề bài hát không được vượt quá 255 ký tự.';
  end if;

  if length(new.content) > 20000 then
    raise exception 'Nội dung bài hát không được vượt quá 20.000 ký tự.';
  end if;

  -- Giới hạn 5 bài / 24 giờ cho tài khoản thường
  if not public.is_admin() and new.created_by is not null then
    select count(*) into v_count
    from public.songs
    where created_by = new.created_by
      and created_at > now() - interval '24 hours';

    if v_count >= 5 then
      raise exception 'Bạn đã đạt giới hạn đăng tối đa 5 bài trong 24 giờ. Vui lòng quay lại sau.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_song_limits on public.songs;
create trigger trg_song_limits
  before insert on public.songs
  for each row execute function public.trg_check_song_limits();

-- 5.5. Giới hạn 5 yêu cầu bài hát trong 24h
create or replace function public.trg_check_request_limits()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_count int;
begin
  if length(new.title) > 255 then
    raise exception 'Tên bài hát yêu cầu không được vượt quá 255 ký tự.';
  end if;

  if not public.is_admin() and new.user_id is not null then
    select count(*) into v_count
    from public.song_requests
    where user_id = new.user_id
      and created_at > now() - interval '24 hours';

    if v_count >= 5 then
      raise exception 'Bạn đã đạt giới hạn gửi tối đa 5 yêu cầu bài hát trong 24 giờ.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_request_limits on public.song_requests;
create trigger trg_request_limits
  before insert on public.song_requests
  for each row execute function public.trg_check_request_limits();

-- 5.6. Đồng bộ số phiếu votes_count khi có vote/unvote
create or replace function public.trg_sync_song_request_votes()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.song_requests
    set votes_count = votes_count + 1, updated_at = now()
    where id = new.request_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.song_requests
    set votes_count = greatest(0, votes_count - 1), updated_at = now()
    where id = old.request_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_request_votes_sync on public.song_request_votes;
create trigger trg_request_votes_sync
  after insert or delete on public.song_request_votes
  for each row execute function public.trg_sync_song_request_votes();

-- 6. HÀM RPC QUẢN TRỊ ADMIN (SECURITY DEFINER + TRANSACTION LOGGING)

-- 6.1. Duyệt bài hát
create or replace function public.admin_verify_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền duyệt bài.';
  end if;

  update public.songs
  set is_verified = true,
      takedown_status = 'none'::public.takedown_status,
      rejection_reason = null,
      published_at = coalesce(published_at, now()),
      updated_at = now()
  where id = p_song_id
  returning title into v_title;

  if not found then
    raise exception 'Không tìm thấy bài hát.';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'verify_song', 'song', p_song_id::text, jsonb_build_object('title', v_title));
end;
$$;

-- 6.2. Từ chối bài hát kèm lý do
create or replace function public.admin_reject_song(p_song_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền từ chối bài.';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Vui lòng cung cấp lý do từ chối bài hát.';
  end if;

  update public.songs
  set is_verified = false,
      rejection_reason = trim(p_reason),
      updated_at = now()
  where id = p_song_id
  returning title into v_title;

  if not found then
    raise exception 'Không tìm thấy bài hát.';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'reject_song', 'song', p_song_id::text, jsonb_build_object('title', v_title, 'reason', trim(p_reason)));
end;
$$;

-- 6.3. Gỡ bài hát (Takedown do khiếu nại bản quyền)
create or replace function public.admin_takedown_song(p_song_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_title text;
  v_takedown public.takedown_status;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền gỡ bài hát.';
  end if;

  if p_status = 'requested' then
    v_takedown := 'requested'::public.takedown_status;
  elsif p_status = 'removed' then
    v_takedown := 'removed'::public.takedown_status;
  elsif p_status = 'none' then
    v_takedown := 'none'::public.takedown_status;
  else
    raise exception 'Trạng thái gỡ bài không hợp lệ.';
  end if;

  update public.songs
  set takedown_status = v_takedown,
      is_verified = (v_takedown = 'none'::public.takedown_status),
      updated_at = now()
  where id = p_song_id
  returning title into v_title;

  if not found then
    raise exception 'Không tìm thấy bài hát.';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'takedown_song', 'song', p_song_id::text, jsonb_build_object('title', v_title, 'status', p_status, 'reason', p_reason));
end;
$$;

-- 6.4. Ẩn / hiện bình luận
create or replace function public.admin_toggle_hide_comment(p_comment_id uuid, p_is_hidden boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền ẩn bình luận.';
  end if;

  update public.comments
  set is_hidden = p_is_hidden
  where id = p_comment_id;

  if not found then
    raise exception 'Không tìm thấy bình luận.';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'toggle_hide_comment', 'comment', p_comment_id::text, jsonb_build_object('is_hidden', p_is_hidden, 'reason', p_reason));
end;
$$;

-- 6.5. Xoá bình luận
create or replace function public.admin_delete_comment(p_comment_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền xoá bình luận.';
  end if;

  delete from public.comments where id = p_comment_id;

  if not found then
    raise exception 'Không tìm thấy bình luận.';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'delete_comment', 'comment', p_comment_id::text, jsonb_build_object('reason', p_reason));
end;
$$;

-- 6.6. Khoá tài khoản vi phạm (không được tự khoá mình hoặc admin khác)
create or replace function public.admin_ban_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_target_role public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền khoá tài khoản.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Quản trị viên không thể tự khoá tài khoản của chính mình.';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Không tìm thấy tài khoản người dùng.';
  end if;

  if v_target_role = 'admin'::public.user_role then
    raise exception 'Không thể khoá tài khoản của quản trị viên khác.';
  end if;

  update public.profiles
  set is_banned = true,
      ban_reason = trim(p_reason),
      banned_at = now(),
      updated_at = now()
  where id = p_user_id;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'ban_user', 'user', p_user_id::text, jsonb_build_object('reason', trim(p_reason)));
end;
$$;

-- 6.7. Mở khoá tài khoản
create or replace function public.admin_unban_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền mở khoá tài khoản.';
  end if;

  update public.profiles
  set is_banned = false,
      ban_reason = null,
      banned_at = null,
      updated_at = now()
  where id = p_user_id;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'unban_user', 'user', p_user_id::text, null);
end;
$$;

-- 6.8. Duyệt phiên bản sửa bài hát (Song Revision)
create or replace function public.admin_approve_revision(p_revision_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_rev record;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền duyệt phiên bản sửa đổi.';
  end if;

  select * into v_rev from public.song_revisions where id = p_revision_id;
  if not found then
    raise exception 'Không tìm thấy phiên bản sửa đổi.';
  end if;

  -- Áp dụng nội dung mới vào bài hát (sẽ kích hoạt trigger trg_songs_sync_chords)
  update public.songs
  set title = v_rev.title,
      key = v_rev.key,
      content = v_rev.content,
      chords = v_rev.chords,
      updated_at = now()
  where id = v_rev.song_id;

  update public.song_revisions
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_revision_id;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'approve_revision', 'song_revision', p_revision_id::text, jsonb_build_object('song_id', v_rev.song_id));
end;
$$;

-- 6.9. Từ chối phiên bản sửa bài hát
create or replace function public.admin_reject_revision(p_revision_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_song_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền từ chối phiên bản.';
  end if;

  update public.song_revisions
  set status = 'rejected',
      admin_note = trim(p_reason),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_revision_id
  returning song_id into v_song_id;

  if not found then
    raise exception 'Không tìm thấy phiên bản.';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (auth.uid(), 'reject_revision', 'song_revision', p_revision_id::text, jsonb_build_object('song_id', v_song_id, 'reason', trim(p_reason)));
end;
$$;

-- 6.10. Khôi phục phiên bản cũ (Tạo revision mới ghi nhận, cập nhật bài hát & kích hoạt trigger đồng bộ song_chords)
create or replace function public.admin_restore_revision(p_revision_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_old record;
  v_new_rev_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền khôi phục phiên bản.';
  end if;

  select * into v_old from public.song_revisions where id = p_revision_id;
  if not found then
    raise exception 'Không tìm thấy phiên bản cần khôi phục.';
  end if;

  -- Tạo revision mới ghi nhận hành động khôi phục
  insert into public.song_revisions (
    song_id,
    revised_by,
    title,
    key,
    content,
    chords,
    reason,
    status,
    reviewed_by,
    reviewed_at
  ) values (
    v_old.song_id,
    auth.uid(),
    v_old.title,
    v_old.key,
    v_old.content,
    v_old.chords,
    'Khôi phục từ phiên bản ' || p_revision_id::text,
    'approved',
    auth.uid(),
    now()
  ) returning id into v_new_rev_id;

  -- Cập nhật vào bài hát (tự kích hoạt trigger trg_songs_sync_chords đồng bộ song_chords)
  update public.songs
  set title = v_old.title,
      key = v_old.key,
      content = v_old.content,
      chords = v_old.chords,
      updated_at = now()
  where id = v_old.song_id;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'restore_revision',
    'song_revision',
    p_revision_id::text,
    jsonb_build_object('song_id', v_old.song_id, 'new_revision_id', v_new_rev_id)
  );

  return v_new_rev_id;
end;
$$;

-- 6.11. Xử lý báo cáo lỗi / khiếu nại bản quyền
create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_status text,
  p_note text default null,
  p_takedown boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_rep record;
  v_status public.report_status;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền xử lý báo cáo.';
  end if;

  if p_status = 'resolved' then
    v_status := 'resolved'::public.report_status;
  elsif p_status = 'dismissed' then
    v_status := 'dismissed'::public.report_status;
  elsif p_status = 'reviewing' then
    v_status := 'reviewing'::public.report_status;
  else
    v_status := 'pending'::public.report_status;
  end if;

  update public.reports
  set status = v_status,
      admin_note = trim(p_note),
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = p_report_id
  returning * into v_rep;

  if not found then
    raise exception 'Không tìm thấy báo cáo.';
  end if;

  -- Nếu admin chọn gỡ bài hát khi xử lý khiếu nại
  if p_takedown is true and v_rep.song_id is not null then
    update public.songs
    set takedown_status = 'removed'::public.takedown_status,
        is_verified = false,
        updated_at = now()
    where id = v_rep.song_id;
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'resolve_report',
    'report',
    p_report_id::text,
    jsonb_build_object('song_id', v_rep.song_id, 'status', p_status, 'takedown', p_takedown, 'note', p_note)
  );
end;
$$;

-- 6.12. Gắn bài hát đã duyệt vào yêu cầu hợp âm (Đánh dấu 'Đã có')
create or replace function public.admin_fulfill_request(
  p_request_id uuid,
  p_song_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_song record;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền hoàn thành yêu cầu.';
  end if;

  -- Kiểm tra bài hát phải đã duyệt và không bị gỡ
  select id, title, is_verified, takedown_status into v_song
  from public.songs
  where id = p_song_id;

  if not found then
    raise exception 'Không tìm thấy bài hát để gắn vào yêu cầu.';
  end if;

  if v_song.is_verified is not true or v_song.takedown_status <> 'none'::public.takedown_status then
    raise exception 'Chỉ có thể liên kết với bài hát đã được duyệt công khai và không bị gỡ bản quyền.';
  end if;

  update public.song_requests
  set status = 'fulfilled',
      fulfilled_song_id = p_song_id,
      updated_at = now()
  where id = p_request_id;

  if not found then
    raise exception 'Không tìm thấy yêu cầu hợp âm.';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'fulfill_request',
    'song_request',
    p_request_id::text,
    jsonb_build_object('song_id', p_song_id, 'song_title', v_song.title)
  );
end;
$$;

-- 6.13. Sắp xếp danh sách bài hát trong playlist (reorder_playlist)
create or replace function public.reorder_playlist(
  p_playlist_id uuid,
  p_song_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_owner uuid;
  v_i int;
  v_song_id uuid;
begin
  select user_id into v_owner from public.playlists where id = p_playlist_id;
  if not found then
    raise exception 'Không tìm thấy playlist.';
  end if;

  if v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'Bạn không có quyền chỉnh sửa thứ tự bài trong playlist này.';
  end if;

  if p_song_ids is not null and array_length(p_song_ids, 1) > 0 then
    for v_i in 1..array_length(p_song_ids, 1) loop
      v_song_id := p_song_ids[v_i];
      update public.playlist_songs
      set position = v_i
      where playlist_id = p_playlist_id and song_id = v_song_id;
    end loop;
  end if;

  update public.playlists set updated_at = now() where id = p_playlist_id;
end;
$$;

-- 7. CHÍNH SÁCH BẢO MẬT ROW LEVEL SECURITY (RLS)

-- 7.1. SONG_REVISIONS
alter table public.song_revisions enable row level security;

drop policy if exists "Xem song_revisions" on public.song_revisions;
create policy "Xem song_revisions" on public.song_revisions
  for select using (
    revised_by = auth.uid()
    or exists (select 1 from public.songs s where s.id = song_id and s.created_by = auth.uid())
    or public.is_admin()
  );

drop policy if exists "Tạo song_revisions" on public.song_revisions;
create policy "Tạo song_revisions" on public.song_revisions
  for insert with check (
    auth.uid() is not null
    and auth.uid() = revised_by
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true)
  );

-- 7.2. SONG_REQUESTS
alter table public.song_requests enable row level security;

drop policy if exists "Xem danh sách yêu cầu hợp âm" on public.song_requests;
create policy "Xem danh sách yêu cầu hợp âm" on public.song_requests
  for select using (true);

drop policy if exists "Gửi yêu cầu hợp âm mới" on public.song_requests;
create policy "Gửi yêu cầu hợp âm mới" on public.song_requests
  for insert with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true)
  );

drop policy if exists "Sửa yêu cầu của mình" on public.song_requests;
create policy "Sửa yêu cầu của mình" on public.song_requests
  for update using (
    (auth.uid() = user_id and status = 'pending')
    or public.is_admin()
  );

drop policy if exists "Xoá yêu cầu của mình" on public.song_requests;
create policy "Xoá yêu cầu của mình" on public.song_requests
  for delete using (
    auth.uid() = user_id
    or public.is_admin()
  );

-- 7.3. SONG_REQUEST_VOTES
alter table public.song_request_votes enable row level security;

drop policy if exists "Xem bình chọn yêu cầu" on public.song_request_votes;
create policy "Xem bình chọn yêu cầu" on public.song_request_votes
  for select using (true);

drop policy if exists "Bình chọn cho yêu cầu" on public.song_request_votes;
create policy "Bình chọn cho yêu cầu" on public.song_request_votes
  for insert with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true)
  );

drop policy if exists "Hủy bình chọn yêu cầu" on public.song_request_votes;
create policy "Hủy bình chọn yêu cầu" on public.song_request_votes
  for delete using (auth.uid() = user_id);

-- 7.4. ADMIN_LOGS
alter table public.admin_logs enable row level security;

drop policy if exists "Chỉ admin xem admin_logs" on public.admin_logs;
create policy "Chỉ admin xem admin_logs" on public.admin_logs
  for select using (public.is_admin());

drop policy if exists "Chỉ admin tạo admin_logs" on public.admin_logs;
create policy "Chỉ admin tạo admin_logs" on public.admin_logs
  for insert with check (public.is_admin());

-- Thu hồi quyền sửa/xoá admin_logs đối với tất cả người dùng
revoke update, delete on public.admin_logs from public, anon, authenticated;

-- 7.5. CẬP NHẬT RLS COMMENTS (Ẩn bình luận)
drop policy if exists "Đọc bình luận công khai" on public.comments;
create policy "Đọc bình luận công khai" on public.comments
  for select using (
    is_hidden = false
    or auth.uid() = user_id
    or public.is_admin()
  );

-- 7.6. CẬP NHẬT RLS PLAYLIST_SONGS (Lọc bài trong playlist)
drop policy if exists "Xem bài trong playlist hợp lệ" on public.playlist_songs;
create policy "Xem bài trong playlist hợp lệ" on public.playlist_songs
  for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (p.is_public = true or p.user_id = auth.uid() or public.is_admin())
    )
    and exists (
      select 1 from public.songs s
      where s.id = song_id
        and (
          (s.is_verified = true and s.takedown_status = 'none'::public.takedown_status)
          or s.created_by = auth.uid()
          or public.is_admin()
        )
    )
  );

