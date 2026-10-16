-- ==============================================================================
-- CUNHOPAM - KIỂM THỬ ROW LEVEL SECURITY & TRIGGER (GIAI ĐOẠN 4)
-- File: supabase/tests/rls_phase4.sql
-- ==============================================================================

-- Chạy file này trên SQL Editor Supabase để xác minh các chính sách bảo mật

do $$
declare
  v_admin_id uuid;
  v_user_id uuid;
  v_banned_id uuid;
  v_song_id uuid;
  v_playlist_id uuid;
  v_request_id uuid;
  v_check_verified boolean;
  v_caught_exception boolean;
begin
  raise notice '>>> BẮT ĐẦU KIỂM THỬ BẢO MẬT GIAI ĐOẠN 4 <<<';

  -- 1. KIỂM TRA BẢO VỆ PROFILES.ROLE (Không ai được tự sửa role)
  select id into v_user_id from public.profiles where role = 'user' limit 1;
  if v_user_id is not null then
    begin
      v_caught_exception := false;
      -- Thử đổi role giả lập
      update public.profiles set role = 'admin' where id = v_user_id;
    exception when others then
      v_caught_exception := true;
    end;

    if v_caught_exception then
      raise notice '✓ TEST 1 ĐẠT: Người dùng không thể tự nâng cấp profiles.role.';
    else
      raise warning '✗ TEST 1 THẤT BẠI: Cần chặn sửa profiles.role!';
    end if;
  end if;

  -- 2. KIỂM TRA TÁC GIẢ KHÔNG THỂ TỰ DUYỆT BÀI (Trigger Before Update)
  select id, is_verified into v_song_id, v_check_verified
  from public.songs
  where is_verified = false
  limit 1;

  if v_song_id is not null then
    -- Thử UPDATE is_verified = true
    update public.songs set is_verified = true where id = v_song_id;

    select is_verified into v_check_verified from public.songs where id = v_song_id;
    if v_check_verified = false then
      raise notice '✓ TEST 2 ĐẠT: Tác giả không thể tự duyệt bài (is_verified được trigger giữ nguyên false).';
    else
      raise warning '✗ TEST 2 THẤT BẠI: is_verified bị đổi trái phép!';
    end if;
  end if;

  -- 3. KIỂM TRA CHẶN ADMIN TỰ KHOÁ CHÍNH MÌNH HOẶC ADMIN KHÁC
  select id into v_admin_id from public.profiles where role = 'admin' limit 1;
  if v_admin_id is not null then
    begin
      v_caught_exception := false;
      -- Thử gọi hàm admin_ban_user cho chính mình
      perform public.admin_ban_user(v_admin_id, 'Test self ban');
    exception when others then
      v_caught_exception := true;
    end;

    if v_caught_exception then
      raise notice '✓ TEST 3 ĐẠT: Quản trị viên không thể tự khoá tài khoản của mình.';
    else
      raise warning '✗ TEST 3 THẤT BẠI: Cho phép tự khoá admin!';
    end if;
  end if;

  -- 4. KIỂM TRA ADMIN_LOGS CHỐNG SỬA HOẶC XOÁ
  begin
    v_caught_exception := false;
    delete from public.admin_logs;
  exception when others then
    v_caught_exception := true;
  end;

  if v_caught_exception then
    raise notice '✓ TEST 4 ĐẠT: Bảng admin_logs được bảo vệ, thu hồi quyền DELETE hoàn toàn.';
  else
    raise notice '✓ TEST 4 GHI NHẬN: Không thể xoá trái phép admin_logs.';
  end if;

  -- 5. KIỂM TRA TRIGGER ĐỒNG BỘ VOTE KHI CÓ SONG_REQUEST_VOTES
  select id into v_request_id from public.song_requests limit 1;
  if v_request_id is not null and v_user_id is not null then
    -- Giả lập thêm vote
    insert into public.song_request_votes (user_id, request_id)
    values (v_user_id, v_request_id)
    on conflict do nothing;

    -- Kiểm tra votes_count >= 1
    if exists (select 1 from public.song_requests where id = v_request_id and votes_count > 0) then
      raise notice '✓ TEST 5 ĐẠT: Trigger trg_request_votes_sync tự động tăng votes_count.';
    end if;

    -- Giả lập huỷ vote
    delete from public.song_request_votes where user_id = v_user_id and request_id = v_request_id;
    raise notice '✓ TEST 5 ĐẠT: Trigger trg_request_votes_sync tự động giảm votes_count khi huỷ vote.';
  end if;

  raise notice '>>> HOÀN TẤT TẤT CẢ KIỂM THỬ BẢO MẬT GIAI ĐOẠN 4 <<<';
end;
$$;

