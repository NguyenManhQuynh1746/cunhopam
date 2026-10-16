-- ==============================================================================
-- CUNHOPAM - SUPABASE DATABASE SCHEMA
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. ENUMS
create type public.license_type as enum (
  'public_domain',
  'creative_commons',
  'original',
  'permission',
  'user_submitted'
);

create type public.takedown_status as enum (
  'none',
  'requested',
  'removed'
);

create type public.user_role as enum (
  'user',
  'admin'
);

create type public.report_status as enum (
  'pending',
  'resolved',
  'dismissed'
);

-- 3. PROFILES TABLE (Đồng bộ từ auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  role public.user_role default 'user'::public.user_role not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. ARTISTS, GENRES, RHYTHMS
create table if not exists public.artists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  bio text,
  avatar_url text,
  created_at timestamptz default now() not null
);

create table if not exists public.genres (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  created_at timestamptz default now() not null
);

create table if not exists public.rhythms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  time_signature text default '4/4',
  tempo_hint text,
  created_at timestamptz default now() not null
);

-- 5. SONGS TABLE
create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  artist_id uuid references public.artists(id) on delete set null,
  genre_id uuid references public.genres(id) on delete set null,
  rhythm_id uuid references public.rhythms(id) on delete set null,
  key text default 'C' not null,
  content text not null,
  chords jsonb default '[]'::jsonb not null,
  license_type public.license_type default 'user_submitted'::public.license_type not null,
  rights_holder text,
  source_url text,
  license_note text,
  is_verified boolean default false not null,
  takedown_status public.takedown_status default 'none'::public.takedown_status not null,
  view_count integer default 0 not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 6. MANY-TO-MANY RELATIONSHIPS
create table if not exists public.song_artists (
  song_id uuid references public.songs(id) on delete cascade not null,
  artist_id uuid references public.artists(id) on delete cascade not null,
  role text default 'performer' not null, -- 'composer', 'lyricist', 'performer'
  primary key (song_id, artist_id, role)
);

create table if not exists public.song_genres (
  song_id uuid references public.songs(id) on delete cascade not null,
  genre_id uuid references public.genres(id) on delete cascade not null,
  primary key (song_id, genre_id)
);

-- 7. CHORDS TABLE (Kho hợp âm guitar chuẩn hoá)
create table if not exists public.chords (
  id uuid default gen_random_uuid() primary key,
  instrument text default 'guitar' not null,
  root text not null,
  suffix text not null,
  positions jsonb not null, -- [{frets, fingers, barres, baseFret, midi}]
  created_at timestamptz default now() not null,
  unique (instrument, root, suffix)
);

-- 8. FAVORITES & PLAYLISTS
create table if not exists public.favorites (
  user_id uuid references auth.users(id) on delete cascade not null,
  song_id uuid references public.songs(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (user_id, song_id)
);

create table if not exists public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  is_public boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.playlist_songs (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  song_id uuid references public.songs(id) on delete cascade not null,
  position integer default 0 not null,
  created_at timestamptz default now() not null,
  unique (playlist_id, song_id)
);

-- 9. COMMENTS & REPORTS
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status public.report_status default 'pending'::public.report_status not null,
  created_at timestamptz default now() not null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

-- ==============================================================================
-- 10. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Hàm kiểm tra quyền admin tránh đệ quy RLS (SECURITY DEFINER)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'::public.user_role
  );
$$;

-- Tự động tạo profile khi có user đăng ký qua auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'user'::public.user_role
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger ngăn chặn người dùng tự chỉnh sửa cột role trong profiles
create or replace function public.prevent_user_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Không có quyền thay đổi vai trò (role) của tài khoản.';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_role_update on public.profiles;
create trigger on_profile_role_update
  before update on public.profiles
  for each row execute function public.prevent_user_role_change();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.genres enable row level security;
alter table public.rhythms enable row level security;
alter table public.songs enable row level security;
alter table public.song_artists enable row level security;
alter table public.song_genres enable row level security;
alter table public.chords enable row level security;
alter table public.favorites enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- PROFILES
create policy "Công khai có thể đọc hồ sơ người dùng" on public.profiles
  for select using (true);

create policy "Người dùng cập nhật hồ sơ của chính mình" on public.profiles
  for update using (auth.uid() = id);

-- CHORDS (Đọc công khai)
create policy "Mọi người đều có thể tra cứu hợp âm" on public.chords
  for select using (true);

create policy "Chỉ admin mới có quyền sửa đổi kho hợp âm" on public.chords
  for all using (public.is_admin());

-- ARTISTS, GENRES, RHYTHMS (Đọc công khai, admin quản trị)
create policy "Đọc danh sách nghệ sĩ" on public.artists for select using (true);
create policy "Admin quản trị nghệ sĩ" on public.artists for all using (public.is_admin());

create policy "Đọc danh sách thể loại" on public.genres for select using (true);
create policy "Admin quản trị thể loại" on public.genres for all using (public.is_admin());

create policy "Đọc danh sách điệu nhạc" on public.rhythms for select using (true);
create policy "Admin quản trị điệu nhạc" on public.rhythms for all using (public.is_admin());

-- SONGS
-- 1. Công khai chỉ xem bài hát đã xác thực và không bị gỡ bỏ bản quyền
-- 2. Tác giả xem được bài của chính mình dù chưa duyệt
-- 3. Admin có toàn quyền xem tất cả
create policy "Quyền xem bài hát" on public.songs
  for select using (
    (is_verified = true and takedown_status = 'none'::public.takedown_status)
    or (auth.uid() is not null and created_by = auth.uid())
    or public.is_admin()
  );

create policy "Thành viên đăng bài hát mới" on public.songs
  for insert with check (auth.uid() is not null and created_by = auth.uid());

create policy "Tác giả hoặc Admin cập nhật bài hát" on public.songs
  for update using (
    (auth.uid() is not null and created_by = auth.uid())
    or public.is_admin()
  );

create policy "Tác giả hoặc Admin xoá bài hát" on public.songs
  for delete using (
    (auth.uid() is not null and created_by = auth.uid())
    or public.is_admin()
  );

-- SONG_ARTISTS & SONG_GENRES
create policy "Đọc song_artists công khai" on public.song_artists for select using (true);
create policy "Admin quản trị song_artists" on public.song_artists for all using (public.is_admin());

create policy "Đọc song_genres công khai" on public.song_genres for select using (true);
create policy "Admin quản trị song_genres" on public.song_genres for all using (public.is_admin());

-- FAVORITES
create policy "Xem bài hát yêu thích của mình" on public.favorites
  for select using (auth.uid() = user_id);

create policy "Thêm bài hát yêu thích" on public.favorites
  for insert with check (auth.uid() = user_id);

create policy "Xoá bài hát yêu thích" on public.favorites
  for delete using (auth.uid() = user_id);

-- PLAYLISTS
create policy "Xem playlist công khai hoặc của chính mình" on public.playlists
  for select using (is_public = true or auth.uid() = user_id or public.is_admin());

create policy "Tạo playlist cá nhân" on public.playlists
  for insert with check (auth.uid() = user_id);

create policy "Sửa playlist của chính mình" on public.playlists
  for update using (auth.uid() = user_id or public.is_admin());

create policy "Xoá playlist của chính mình" on public.playlists
  for delete using (auth.uid() = user_id or public.is_admin());

-- PLAYLIST_SONGS
create policy "Xem bài trong playlist hợp lệ" on public.playlist_songs
  for select using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.is_public = true or p.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Quản lý bài trong playlist của mình" on public.playlist_songs
  for all using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and (p.user_id = auth.uid() or public.is_admin())
    )
  );

-- COMMENTS
create policy "Đọc bình luận công khai" on public.comments
  for select using (true);

create policy "Đăng bình luận" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "Xoá bình luận của mình hoặc admin" on public.comments
  for delete using (auth.uid() = user_id or public.is_admin());

-- REPORTS
create policy "Gửi báo cáo/khiếu nại bài hát" on public.reports
  for insert with check (true);

create policy "Chỉ admin được xem và xử lý báo cáo" on public.reports
  for all using (public.is_admin());

