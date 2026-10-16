-- ==============================================================================
-- CUNHOPAM - GIAI ĐOẠN 3: THƯ VIỆN HỢP ÂM & TÌM BÀI THEO HỢP ÂM (RPC & BẢO MẬT)
-- ==============================================================================

-- 1. BẢO MẬT GIAI ĐOẠN 2 BỔ SUNG
revoke all on function public.record_song_view(uuid, text) from public;
revoke all on function public.record_song_view(uuid, text) from anon;
revoke all on function public.record_song_view(uuid, text) from authenticated;
grant execute on function public.record_song_view(uuid, text) to service_role;

alter table public.comments enable row level security;
drop policy if exists "Đăng bình luận" on public.comments;
create policy "Đăng bình luận" on public.comments
  for insert with check (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists "Xoá bình luận của mình hoặc admin" on public.comments;
create policy "Xoá bình luận của mình hoặc admin" on public.comments
  for delete using (auth.uid() = user_id or public.is_admin());

alter table public.reports add column if not exists ip_address text;

-- 2. BẢNG SONG_CHORDS & USER_KNOWN_CHORDS
create table if not exists public.song_chords (
  song_id uuid references public.songs(id) on delete cascade not null,
  chord_name text not null,
  primary key (song_id, chord_name)
);

create index if not exists idx_song_chords_chord on public.song_chords (chord_name);
create index if not exists idx_song_chords_song on public.song_chords (song_id);

alter table public.song_chords enable row level security;

drop policy if exists "Đọc song_chords của bài đã duyệt" on public.song_chords;
create policy "Đọc song_chords của bài đã duyệt" on public.song_chords
  for select using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and (
          (s.is_verified = true and s.takedown_status = 'none'::public.takedown_status)
          or (auth.uid() is not null and s.created_by = auth.uid())
          or public.is_admin()
        )
    )
  );

drop policy if exists "Admin và service_role quản lý song_chords" on public.song_chords;
create policy "Admin và service_role quản lý song_chords" on public.song_chords
  for all using (public.is_admin());

-- Bảng lưu danh sách hợp âm người dùng đã biết
create table if not exists public.user_known_chords (
  user_id uuid references auth.users(id) on delete cascade not null,
  chord_name text not null,
  created_at timestamptz default now() not null,
  primary key (user_id, chord_name)
);

alter table public.user_known_chords enable row level security;

drop policy if exists "Chủ tài khoản quản lý hợp âm đã biết" on public.user_known_chords;
create policy "Chủ tài khoản quản lý hợp âm đã biết" on public.user_known_chords
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. HÀM CHUẨN HOÁ TÊN HỢP ÂM TRONG SQL (Tương đương normalizeChordName của TypeScript)
create or replace function public.normalize_chord_name(p_chord text)
returns text
language plpgsql
immutable
parallel safe
set search_path = public, extensions
as $$
declare
  v_chord text;
  v_slash_idx int;
  v_root text;
  v_suffix text;
  v_upper text;
begin
  if p_chord is null or trim(p_chord) = '' then
    return '';
  end if;

  v_chord := trim(p_chord);

  -- 1. Cắt bỏ nốt bass của Slash chord (C/G -> C, D/F# -> D)
  v_slash_idx := position('/' in v_chord);
  if v_slash_idx > 0 then
    v_chord := trim(substring(v_chord from 1 for v_slash_idx - 1));
  end if;

  -- 2. Tách nốt gốc và hậu tố bằng regex
  -- Nốt gốc có thể là: A-G kèm dấu # hoặc b, hoặc tiếng Việt Do, Re, Mi, Fa, Sol, La, Si
  v_root := substring(v_chord from '^([A-Ga-g][#b]?|[ĐđDd][oôOÔ]#?|[Rr][eêEÊ]#?|[Mm]i#?|[Ff]a#?|[Ss]ol#?|[Ll]a#?|[Ss]i#?)');
  v_suffix := substring(v_chord from length(v_root) + 1);

  if v_root is null or v_root = '' then
    return v_chord;
  end if;

  v_upper := upper(v_root);

  -- Thay thế tiếng Việt có dấu
  v_upper := replace(replace(replace(replace(replace(replace(v_upper, 'Đ', 'D'), 'đ', 'D'), 'Ô', 'O'), 'ô', 'O'), 'Ê', 'E'), 'ê', 'E');

  -- Đưa tất cả nốt giáng (b) và tiếng Việt về nốt thăng (#) chuẩn nhạc lý
  if v_upper in ('C', 'DO') then v_root := 'C';
  elsif v_upper in ('C#', 'DB', 'DO#') then v_root := 'C#';
  elsif v_upper in ('D', 'RE') then v_root := 'D';
  elsif v_upper in ('D#', 'EB', 'RE#') then v_root := 'D#';
  elsif v_upper in ('E', 'FB', 'MI') then v_root := 'E';
  elsif v_upper in ('F', 'E#', 'FA') then v_root := 'F';
  elsif v_upper in ('F#', 'GB', 'FA#') then v_root := 'F#';
  elsif v_upper in ('G', 'SOL') then v_root := 'G';
  elsif v_upper in ('G#', 'AB', 'SOL#') then v_root := 'G#';
  elsif v_upper in ('A', 'LA') then v_root := 'A';
  elsif v_upper in ('A#', 'BB', 'LA#') then v_root := 'A#';
  elsif v_upper in ('B', 'CB', 'SI') then v_root := 'B';
  else v_root := v_upper;
  end if;

  -- Chuẩn hoá các bí danh hậu tố
  if v_suffix = 'M' or v_suffix = 'major' then
    v_suffix := '';
  elsif v_suffix = 'min' then
    v_suffix := 'm';
  elsif v_suffix = 'M7' then
    v_suffix := 'maj7';
  end if;

  return v_root || coalesce(v_suffix, '');
end;
$$;

-- 4. HÀM VÀ TRIGGER ĐỒNG BỘ SONG_CHORDS TỪ NỘI DUNG CHORDPRO (songs.content)
create or replace function public.sync_song_chords_for_song(p_song_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_raw_chord text;
  v_norm_chord text;
begin
  -- Xoá danh sách hợp âm cũ của bài
  delete from public.song_chords where song_id = p_song_id;

  if p_content is null or trim(p_content) = '' then
    return;
  end if;

  -- Trích xuất tất cả các hợp âm nằm trong ngoặc vuông [...] từ ChordPro content
  for v_raw_chord in
    select distinct match[1]
    from regexp_matches(p_content, '\[([A-Za-z0-9#b/+-]+)\]', 'g') as match
  loop
    v_norm_chord := public.normalize_chord_name(v_raw_chord);
    if v_norm_chord is not null and v_norm_chord <> '' then
      insert into public.song_chords (song_id, chord_name)
      values (p_song_id, v_norm_chord)
      on conflict (song_id, chord_name) do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.trg_sync_song_chords()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if TG_OP = 'INSERT' or NEW.content is distinct from OLD.content then
    perform public.sync_song_chords_for_song(NEW.id, NEW.content);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_songs_sync_chords on public.songs;
create trigger trg_songs_sync_chords
  after insert or update of content on public.songs
  for each row
  execute function public.trg_sync_song_chords();

-- Backfill dữ liệu cho toàn bộ các bài hát hiện có trong bảng songs
do $$
declare
  r record;
begin
  for r in select id, content from public.songs loop
    perform public.sync_song_chords_for_song(r.id, r.content);
  end loop;
end;
$$;

-- 5. HÀM RPC: TÌM BÀI HÁT THEO HỢP ÂM ĐÃ BIẾT (find_songs_by_chords)
create or replace function public.find_songs_by_chords(
  p_known_chords text[],
  p_limit int default 50
)
returns table (
  id uuid,
  title text,
  slug text,
  key text,
  view_count int,
  artist_name text,
  artist_slug text,
  rhythm_name text,
  rhythm_slug text,
  genre_name text,
  genre_slug text,
  total_chords int,
  missing_count int,
  match_type text, -- 'ready' | 'missing_one'
  missing_chords text[],
  all_chords text[]
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_norm_known text[];
  v_chord text;
  v_norm text;
  v_limit int;
begin
  -- 1. Kiểm tra giới hạn mảng đầu vào: tối đa 30 hợp âm
  if p_known_chords is not null and array_length(p_known_chords, 1) > 30 then
    raise exception 'Danh sách hợp âm không được vượt quá 30 hợp âm.';
  end if;

  -- 2. Giới hạn p_limit tối đa 100
  v_limit := least(greatest(coalesce(p_limit, 50), 1), 100);

  if p_known_chords is null or array_length(p_known_chords, 1) is null or array_length(p_known_chords, 1) = 0 then
    return;
  end if;

  -- 3. Chuẩn hoá từng hợp âm trong danh sách đã biết và kiểm tra định dạng
  v_norm_known := array[]::text[];
  foreach v_chord in array p_known_chords loop
    -- Kiểm tra định dạng hợp âm hợp lệ bằng regex
    if v_chord ~* '^[A-Ga-g][#b]?(?:[A-Za-z0-9+-]*)(?:\/[A-Ga-g][#b]?)?$' then
      v_norm := public.normalize_chord_name(v_chord);
      if v_norm is not null and v_norm <> '' and not (v_norm = any(v_norm_known)) then
        v_norm_known := array_append(v_norm_known, v_norm);
      end if;
    end if;
  end loop;

  if array_length(v_norm_known, 1) is null or array_length(v_norm_known, 1) = 0 then
    return;
  end if;

  -- 4. Truy vấn tập hợp các bài hát thoả mãn
  return query
  with song_summary as (
    select
      s.id,
      s.title,
      s.slug,
      s.key,
      s.view_count,
      s.published_at,
      a.name as artist_name,
      a.slug as artist_slug,
      r.name as rhythm_name,
      r.slug as rhythm_slug,
      g.name as genre_name,
      g.slug as genre_slug,
      count(sc.chord_name)::int as total_chords,
      count(case when sc.chord_name = any(v_norm_known) then 1 end)::int as known_count,
      array_agg(sc.chord_name) as all_chords,
      coalesce(
        array_agg(sc.chord_name) filter (where not (sc.chord_name = any(v_norm_known))),
        array[]::text[]
      ) as missing_chords
    from public.songs s
    join public.song_chords sc on s.id = sc.song_id
    left join public.artists a on s.artist_id = a.id
    left join public.rhythms r on s.rhythm_id = r.id
    left join public.genres g on s.genre_id = g.id
    where s.is_verified = true
      and s.takedown_status = 'none'::public.takedown_status
    group by s.id, a.name, a.slug, r.name, r.slug, g.name, g.slug
    having count(sc.chord_name) > 0 -- Loại bỏ bài không có hợp âm nào
  )
  select
    ss.id,
    ss.title,
    ss.slug,
    ss.key,
    ss.view_count,
    ss.artist_name,
    ss.artist_slug,
    ss.rhythm_name,
    ss.rhythm_slug,
    ss.genre_name,
    ss.genre_slug,
    ss.total_chords,
    (ss.total_chords - ss.known_count)::int as missing_count,
    case
      when ss.total_chords = ss.known_count then 'ready'
      else 'missing_one'
    end as match_type,
    ss.missing_chords,
    ss.all_chords
  from song_summary ss
  where (ss.total_chords - ss.known_count) in (0, 1) -- Chỉ lấy bài chơi được ngay hoặc chỉ thiếu 1
  order by
    case when ss.total_chords = ss.known_count then 1 else 2 end, -- Ưu tiên 'ready' lên đầu
    ss.view_count desc,
    ss.published_at desc
  limit v_limit;
end;
$$;
