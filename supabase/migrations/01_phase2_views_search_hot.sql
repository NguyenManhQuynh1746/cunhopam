-- ==============================================================================
-- CUNHOPAM - GIAI ĐOẠN 2: LƯỢT XEM, TÌM KIẾM KHÔNG DẤU, TAB HOT & RATE LIMIT
-- ==============================================================================

-- 1. KÍCH HOẠT EXTENSIONS (Trong schema extensions hoặc public)
create extension if not exists "unaccent" schema extensions;
create extension if not exists "pg_trgm" schema extensions;

-- 2. HÀM BỌC IMMUTABLE_UNACCENT (Cho phép dùng trong chỉ mục GIN pg_trgm)
create or replace function public.immutable_unaccent(text)
returns text
language sql immutable parallel safe strict
set search_path = extensions, public
as $$
  select extensions.unaccent($1);
$$;

-- 3. BỔ SUNG CỘT VÀ BẢNG CHO SONGS
alter table public.songs add column if not exists published_at timestamptz default now();
update public.songs set published_at = created_at where published_at is null;

-- Bảng song_views lưu lịch sử lượt xem
create table if not exists public.song_views (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade not null,
  viewer_hash text not null,
  viewed_at timestamptz default now() not null
);

-- Chỉ mục tối ưu tra cứu lượt xem
create index if not exists idx_song_views_lookup
  on public.song_views (song_id, viewer_hash, viewed_at desc);

create index if not exists idx_song_views_time
  on public.song_views (viewed_at desc);

-- Chỉ mục GIN tăng tốc tìm kiếm không dấu
create index if not exists idx_songs_unaccent_title
  on public.songs using gin (public.immutable_unaccent(title) extensions.gin_trgm_ops);

create index if not exists idx_artists_unaccent_name
  on public.artists using gin (public.immutable_unaccent(name) extensions.gin_trgm_ops);

-- RLS cho song_views
alter table public.song_views enable row level security;
create policy "Chỉ admin và service_role được xem song_views" on public.song_views
  for all using (public.is_admin());

-- 4. HÀM RPC: GHI NHẬN LƯỢT XEM (Chống spam 30 phút, chỉ service_role gọi)
create or replace function public.record_song_view(p_song_id uuid, p_viewer_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_recent_exists boolean;
begin
  -- 1. Kiểm tra bài hát có hợp lệ công khai không
  if not exists (
    select 1 from public.songs
    where id = p_song_id
      and is_verified = true
      and takedown_status = 'none'::public.takedown_status
  ) then
    return false;
  end if;

  -- 2. Kiểm tra xem viewer này đã xem bài trong 30 phút qua chưa
  select exists (
    select 1 from public.song_views
    where song_id = p_song_id
      and viewer_hash = p_viewer_hash
      and viewed_at >= (now() - interval '30 minutes')
  ) into v_recent_exists;

  -- 3. Nếu chưa, ghi lượt xem mới và tăng view_count
  if not v_recent_exists then
    insert into public.song_views (song_id, viewer_hash, viewed_at)
    values (p_song_id, p_viewer_hash, now());

    update public.songs
    set view_count = view_count + 1
    where id = p_song_id;

    return true;
  end if;

  return false;
end;
$$;

-- Thu hồi quyền gọi hàm này từ anon và authenticated
revoke execute on function public.record_song_view(uuid, text) from public;
revoke execute on function public.record_song_view(uuid, text) from anon;
revoke execute on function public.record_song_view(uuid, text) from authenticated;

-- 5. HÀM RPC: LẤY DANH SÁCH BÀI HÁT THEO TAB HOT & MỚI ĐĂNG
create or replace function public.get_hot_songs(
  p_time_frame text default 'today',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  slug text,
  key text,
  content text,
  chords jsonb,
  license_type public.license_type,
  rights_holder text,
  source_url text,
  view_count int,
  hot_views bigint,
  published_at timestamptz,
  created_at timestamptz,
  artist_name text,
  artist_slug text,
  rhythm_name text,
  rhythm_slug text,
  genre_name text,
  genre_slug text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_interval interval;
  v_total bigint;
begin
  -- Xác định khoảng thời gian
  if p_time_frame = 'today' then
    v_interval := interval '24 hours';
  elsif p_time_frame = 'week' then
    v_interval := interval '7 days';
  elsif p_time_frame = 'month' then
    v_interval := interval '30 days';
  else
    v_interval := null;
  end if;

  -- Tính tổng số bài thoả mãn
  select count(*) into v_total
  from public.songs s
  where s.is_verified = true
    and s.takedown_status = 'none'::public.takedown_status;

  if v_interval is not null then
    return query
    select
      s.id,
      s.title,
      s.slug,
      s.key,
      s.content,
      s.chords,
      s.license_type,
      s.rights_holder,
      s.source_url,
      s.view_count,
      coalesce(count(v.id), 0)::bigint as hot_views,
      s.published_at,
      s.created_at,
      a.name as artist_name,
      a.slug as artist_slug,
      r.name as rhythm_name,
      r.slug as rhythm_slug,
      g.name as genre_name,
      g.slug as genre_slug,
      v_total as total_count
    from public.songs s
    left join public.artists a on s.artist_id = a.id
    left join public.rhythms r on s.rhythm_id = r.id
    left join public.genres g on s.genre_id = g.id
    left join public.song_views v on s.id = v.song_id and v.viewed_at >= (now() - v_interval)
    where s.is_verified = true
      and s.takedown_status = 'none'::public.takedown_status
    group by s.id, a.name, a.slug, r.name, r.slug, g.name, g.slug
    order by hot_views desc, s.view_count desc, s.published_at desc
    limit p_limit offset p_offset;
  else
    -- Mới đăng: Sắp xếp theo ngày xuất bản mới nhất
    return query
    select
      s.id,
      s.title,
      s.slug,
      s.key,
      s.content,
      s.chords,
      s.license_type,
      s.rights_holder,
      s.source_url,
      s.view_count,
      s.view_count::bigint as hot_views,
      s.published_at,
      s.created_at,
      a.name as artist_name,
      a.slug as artist_slug,
      r.name as rhythm_name,
      r.slug as rhythm_slug,
      g.name as genre_name,
      g.slug as genre_slug,
      v_total as total_count
    from public.songs s
    left join public.artists a on s.artist_id = a.id
    left join public.rhythms r on s.rhythm_id = r.id
    left join public.genres g on s.genre_id = g.id
    where s.is_verified = true
      and s.takedown_status = 'none'::public.takedown_status
    order by s.published_at desc, s.created_at desc
    limit p_limit offset p_offset;
  end if;
end;
$$;

-- 6. HÀM RPC: TÌM KIẾM BÀI HÁT KHÔNG PHÂN BIỆT DẤU TIẾNG VIỆT
create or replace function public.search_songs(
  p_query text,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  slug text,
  key text,
  content text,
  chords jsonb,
  license_type public.license_type,
  rights_holder text,
  source_url text,
  view_count int,
  published_at timestamptz,
  created_at timestamptz,
  artist_name text,
  artist_slug text,
  rhythm_name text,
  rhythm_slug text,
  genre_name text,
  genre_slug text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_norm_query text;
  v_total bigint;
begin
  v_norm_query := trim(public.immutable_unaccent(p_query));

  -- Đếm tổng số bài khớp
  select count(*) into v_total
  from public.songs s
  left join public.artists a on s.artist_id = a.id
  where s.is_verified = true
    and s.takedown_status = 'none'::public.takedown_status
    and (
      public.immutable_unaccent(s.title) ilike '%' || v_norm_query || '%'
      or public.immutable_unaccent(coalesce(a.name, '')) ilike '%' || v_norm_query || '%'
    );

  return query
  select
    s.id,
    s.title,
    s.slug,
    s.key,
    s.content,
    s.chords,
    s.license_type,
    s.rights_holder,
    s.source_url,
    s.view_count,
    s.published_at,
    s.created_at,
    a.name as artist_name,
    a.slug as artist_slug,
    r.name as rhythm_name,
    r.slug as rhythm_slug,
    g.name as genre_name,
    g.slug as genre_slug,
    v_total as total_count
  from public.songs s
  left join public.artists a on s.artist_id = a.id
  left join public.rhythms r on s.rhythm_id = r.id
  left join public.genres g on s.genre_id = g.id
  where s.is_verified = true
    and s.takedown_status = 'none'::public.takedown_status
    and (
      public.immutable_unaccent(s.title) ilike '%' || v_norm_query || '%'
      or public.immutable_unaccent(coalesce(a.name, '')) ilike '%' || v_norm_query || '%'
    )
  order by
    -- Ưu tiên bài có tiêu đề bắt đầu bằng từ khoá
    case when public.immutable_unaccent(s.title) ilike v_norm_query || '%' then 1 else 2 end,
    s.view_count desc,
    s.published_at desc
  limit p_limit offset p_offset;
end;
$$;

-- 7. GIỚI HẠN TẦN SUẤT BÌNH LUẬN (Tối đa 5 bình luận/phút/người, tối đa 1.000 ký tự)
create or replace function public.check_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_comments int;
begin
  -- 1. Kiểm tra độ dài bình luận
  if length(new.content) > 1000 then
    raise exception 'Bình luận không được vượt quá 1.000 ký tự.';
  end if;

  -- 2. Kiểm tra tần suất đăng trong 1 phút qua
  select count(*) into v_recent_comments
  from public.comments
  where user_id = new.user_id
    and created_at >= (now() - interval '1 minute');

  if v_recent_comments >= 5 then
    raise exception 'Bạn đang bình luận quá nhanh. Vui lòng đợi một lát (tối đa 5 bình luận mỗi phút).';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_comment_rate_limit on public.comments;
create trigger trg_comment_rate_limit
  before insert on public.comments
  for each row execute function public.check_comment_rate_limit();

-- 8. SEED DỮ LIỆU ĐIỆU VÀ THỂ LOẠI (Slug không dấu chuẩn URL)
insert into public.rhythms (name, slug, time_signature, tempo_hint)
values
  ('Ballad', 'ballad', '4/4', 'Chậm, êm dịu (65-80 bpm)'),
  ('Slow Rock', 'slow-rock', '6/8', 'Nhịp 6/8 đung đưa (60-72 bpm)'),
  ('Bolero', 'bolero', '4/4', 'Trữ tình, sâu lắng (75-85 bpm)'),
  ('Valse', 'valse', '3/4', 'Nhịp 3/4 nhịp nhàng (90-120 bpm)'),
  ('Disco', 'disco', '4/4', 'Sôi động, dồn dập (115-130 bpm)'),
  ('Pop', 'pop', '4/4', 'Vừa phải, bắt tai (90-110 bpm)'),
  ('Blues', 'blues', '4/4', 'Tự sự, phiêu lãng (70-90 bpm)'),
  ('Acoustic', 'acoustic', '4/4', 'Mộc mạc, nhẹ nhàng (80-100 bpm)'),
  ('Điệu Fox', 'dieu-fox', '2/4', 'Vui tươi, rộn rã (100-120 bpm)'),
  ('Boston', 'boston', '3/4', 'Chậm rãi, hoài niệm (60-70 bpm)')
on conflict (slug) do update set
  name = excluded.name,
  time_signature = excluded.time_signature,
  tempo_hint = excluded.tempo_hint;

insert into public.genres (name, slug)
values
  ('Nhạc Trẻ', 'nhac-tre'),
  ('Trữ Tình', 'tru-tinh'),
  ('Nhạc Trịnh', 'nhac-trinh'),
  ('Pop / Rock', 'pop-rock'),
  ('Tiền Chiến', 'tien-chien'),
  ('Nhạc Nước Ngoài', 'nhac-nuoc-ngoai')
on conflict (slug) do update set
  name = excluded.name;

