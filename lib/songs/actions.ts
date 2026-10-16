'use server';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { validateChordPro } from '@/lib/chordpro/validator';
import { validateSongLicense, LicenseFormData } from '@/lib/songs/license';
import { titleToSlug, resolveUniqueSlug } from '@/lib/songs/slug';

export interface PublishSongInput {
  title: string;
  artist_name: string;
  key: string;
  content: string;
  rhythm_name?: string;
  genre_name?: string;
  license: LicenseFormData;
}

export async function publishSongAction(input: PublishSongInput) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Cơ sở dữ liệu Supabase chưa được cấu hình.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để thực hiện đăng bài hát.' };
  }

  // 1. Kiểm tra tài khoản có bị khoá không
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned, ban_reason')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return {
      success: false,
      error: `Tài khoản của bạn đã bị tạm khoá: ${profile.ban_reason || 'Vi phạm tiêu chuẩn cộng đồng.'}`,
    };
  }

  // 2. Kiểm tra độ dài
  if (!input.title || input.title.trim().length === 0) {
    return { success: false, error: 'Vui lòng nhập tiêu đề bài hát.' };
  }
  if (input.title.trim().length > 255) {
    return { success: false, error: 'Tiêu đề bài hát không được vượt quá 255 ký tự.' };
  }
  if (!input.content || input.content.trim().length === 0) {
    return { success: false, error: 'Vui lòng nhập nội dung lời và hợp âm bài hát.' };
  }
  if (input.content.length > 20000) {
    return { success: false, error: 'Nội dung bài hát không được vượt quá 20.000 ký tự.' };
  }

  // 3. Kiểm tra tính hợp lệ của ChordPro
  const chordValidation = validateChordPro(input.content);
  if (!chordValidation.isValid) {
    return {
      success: false,
      error: chordValidation.errors[0]?.message || 'Nội dung chứa hợp âm không hợp lệ.',
      chordErrors: chordValidation.errors,
    };
  }

  // 4. Kiểm tra giấy phép bản quyền
  const licenseValidation = validateSongLicense(input.license);
  if (!licenseValidation.isValid) {
    const firstErrKey = Object.keys(licenseValidation.errors)[0];
    return {
      success: false,
      error: licenseValidation.errors[firstErrKey],
      licenseErrors: licenseValidation.errors,
    };
  }

  // 5. Kiểm tra giới hạn 5 bài/24h cho tài khoản thường
  if (profile?.role !== 'admin') {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gt('created_at', since24h);

    if (!countErr && (count || 0) >= 5) {
      return {
        success: false,
        error: 'Bạn đã đạt giới hạn đăng tối đa 5 bài hát trong 24 giờ. Vui lòng quay lại sau.',
      };
    }
  }

  try {
    const cleanTitle = input.title.trim().replace(/\s+/g, ' ');

    // 6. Xử lý Nghệ sĩ (Artist)
    let artistId: string | null = null;
    const cleanArtist = input.artist_name.trim().replace(/\s+/g, ' ');
    if (cleanArtist) {
      const artistSlug = titleToSlug(cleanArtist);
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('name', cleanArtist)
        .maybeSingle();

      if (existingArtist) {
        artistId = existingArtist.id;
      } else {
        const { data: newArtist } = await supabase
          .from('artists')
          .insert({ name: cleanArtist, slug: artistSlug })
          .select('id')
          .single();
        if (newArtist) artistId = newArtist.id;
      }
    }

    // 7. Xử lý Điệu nhạc (Rhythm)
    let rhythmId: string | null = null;
    if (input.rhythm_name && input.rhythm_name.trim()) {
      const cleanRhythm = input.rhythm_name.trim();
      const rhythmSlug = titleToSlug(cleanRhythm);
      const { data: existingRhythm } = await supabase
        .from('rhythms')
        .select('id')
        .eq('name', cleanRhythm)
        .maybeSingle();

      if (existingRhythm) {
        rhythmId = existingRhythm.id;
      } else {
        const { data: newRhythm } = await supabase
          .from('rhythms')
          .insert({ name: cleanRhythm, slug: rhythmSlug })
          .select('id')
          .single();
        if (newRhythm) rhythmId = newRhythm.id;
      }
    }

    // 8. Xử lý Thể loại (Genre)
    let genreId: string | null = null;
    if (input.genre_name && input.genre_name.trim()) {
      const cleanGenre = input.genre_name.trim();
      const genreSlug = titleToSlug(cleanGenre);
      const { data: existingGenre } = await supabase
        .from('genres')
        .select('id')
        .eq('name', cleanGenre)
        .maybeSingle();

      if (existingGenre) {
        genreId = existingGenre.id;
      } else {
        const { data: newGenre } = await supabase
          .from('genres')
          .insert({ name: cleanGenre, slug: genreSlug })
          .select('id')
          .single();
        if (newGenre) genreId = newGenre.id;
      }
    }

    // 9. Sinh slug duy nhất không dấu (dùng adminClient để đọc toàn bộ kho bài kể cả bài chờ duyệt)
    const baseSlug = titleToSlug(cleanTitle);
    let existingSlugs: string[] = [];

    try {
      const adminClient = createAdminClient();
      const { data: allSimilar } = await adminClient
        .from('songs')
        .select('slug')
        .ilike('slug', `${baseSlug}%`);

      if (allSimilar) {
        existingSlugs = allSimilar.map((s) => s.slug);
      }
    } catch {
      const { data: similarSongs } = await supabase
        .from('songs')
        .select('slug')
        .ilike('slug', `${baseSlug}%`);

      if (similarSongs) {
        existingSlugs = similarSongs.map((s) => s.slug);
      }
    }

    let finalSlug = resolveUniqueSlug(baseSlug, existingSlugs);

    // 10. Chèn bài hát mới (Mặc định is_verified = false, takedown_status = 'none')
    let { data: newSong, error: insertErr } = await supabase
      .from('songs')
      .insert({
        title: cleanTitle,
        slug: finalSlug,
        content: input.content.trim(),
        key: input.key.trim() || 'C',
        chords: chordValidation.chords,
        artist_id: artistId,
        rhythm_id: rhythmId,
        genre_id: genreId,
        license_type: input.license.license_type,
        rights_holder: input.license.rights_holder?.trim() || null,
        source_url: input.license.source_url?.trim() || null,
        license_note: input.license.license_note?.trim() || null,
        is_verified: false,
        takedown_status: 'none',
        created_by: user.id,
        terms_agreed_at: new Date().toISOString(),
        terms_agreed_by: user.id,
      })
      .select('id, slug')
      .single();

    // Tự động giải quyết xung đột slug nếu có race condition (trùng songs_slug_key)
    if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('songs_slug_key'))) {
      const retrySlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
      const retryRes = await supabase
        .from('songs')
        .insert({
          title: cleanTitle,
          slug: retrySlug,
          content: input.content.trim(),
          key: input.key.trim() || 'C',
          chords: chordValidation.chords,
          artist_id: artistId,
          rhythm_id: rhythmId,
          genre_id: genreId,
          license_type: input.license.license_type,
          rights_holder: input.license.rights_holder?.trim() || null,
          source_url: input.license.source_url?.trim() || null,
          license_note: input.license.license_note?.trim() || null,
          is_verified: false,
          takedown_status: 'none',
          created_by: user.id,
          terms_agreed_at: new Date().toISOString(),
          terms_agreed_by: user.id,
        })
        .select('id, slug')
        .single();

      newSong = retryRes.data;
      insertErr = retryRes.error;
    }

    if (insertErr || !newSong) {
      console.error('Error inserting song:', insertErr);
      const friendlyError = insertErr?.message?.includes('songs_slug_key')
        ? 'Tên bài hát bị trùng lặp với bài đã có trên hệ thống. Vui lòng bấm Đăng bài lại.'
        : insertErr?.message || 'Lỗi khi lưu bài hát vào cơ sở dữ liệu.';
      return { success: false, error: friendlyError };
    }

    revalidatePath('/bai-cua-toi');
    return { success: true, songId: newSong.id, slug: newSong.slug };
  } catch (err: any) {
    console.error('publishSongAction exception:', err);
    return { success: false, error: err?.message || 'Có lỗi xảy ra trong quá trình đăng bài.' };
  }
}

export interface UpdateSongInput {
  songId: string;
  title: string;
  key: string;
  content: string;
  reason?: string;
}

export async function updateSongAction(input: UpdateSongInput) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Cơ sở dữ liệu Supabase chưa được cấu hình.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để thực hiện thao tác này.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return { success: false, error: 'Tài khoản của bạn đang bị tạm khoá.' };
  }

  // Đọc thông tin bài hát hiện tại
  const { data: song, error: fetchErr } = await supabase
    .from('songs')
    .select('*')
    .eq('id', input.songId)
    .single();

  if (fetchErr || !song) {
    return { success: false, error: 'Không tìm thấy bài hát cần chỉnh sửa.' };
  }

  // Kiểm tra quyền: phải là người tạo hoặc admin
  const isOwner = song.created_by === user.id;
  const isAdmin = profile?.role === 'admin';

  if (!isOwner && !isAdmin) {
    return { success: false, error: 'Bạn không có quyền chỉnh sửa bài hát này.' };
  }

  // Kiểm tra tính hợp lệ của ChordPro
  const chordValidation = validateChordPro(input.content);
  if (!chordValidation.isValid) {
    return {
      success: false,
      error: chordValidation.errors[0]?.message || 'Nội dung chứa hợp âm không hợp lệ.',
      chordErrors: chordValidation.errors,
    };
  }

  try {
    // Trường hợp 1: Bài ĐÃ ĐƯỢC DUYỆT (is_verified = true)
    // -> Nội dung mới không được hiện công khai ngay mà lưu thành pending revision
    if (song.is_verified) {
      const { data: rev, error: revErr } = await supabase
        .from('song_revisions')
        .insert({
          song_id: song.id,
          revised_by: user.id,
          title: input.title.trim(),
          key: input.key.trim() || 'C',
          content: input.content.trim(),
          chords: chordValidation.chords,
          reason: input.reason?.trim() || 'Cập nhật hợp âm/lời bài hát',
          status: 'pending',
        })
        .select('id')
        .single();

      if (revErr || !rev) {
        return { success: false, error: revErr?.message || 'Không thể tạo bản ghi phiên bản sửa đổi.' };
      }

      revalidatePath(`/bai-hat/${song.slug}`);
      revalidatePath('/bai-cua-toi');

      return {
        success: true,
        isPendingRevision: true,
        message: 'Bản sửa đổi đã được gửi lên ban quản trị. Phiên bản cũ vẫn hiển thị đến khi được duyệt.',
      };
    }

    // Trường hợp 2: Bài CHƯA DUYỆT (is_verified = false) hoặc ĐANG BỊ TỪ CHỐI
    // -> Cập nhật trực tiếp vào songs, xoá rejection_reason và đưa về chờ duyệt
    const { error: updateErr } = await supabase
      .from('songs')
      .update({
        title: input.title.trim(),
        key: input.key.trim() || 'C',
        content: input.content.trim(),
        chords: chordValidation.chords,
        rejection_reason: null, // Xoá lý do từ chối cũ
        updated_at: new Date().toISOString(),
      })
      .eq('id', song.id);

    if (updateErr) {
      return { success: false, error: updateErr.message || 'Lỗi khi cập nhật bài hát.' };
    }

    revalidatePath(`/bai-hat/${song.slug}`);
    revalidatePath('/bai-cua-toi');

    return {
      success: true,
      isPendingRevision: false,
      message: 'Đã cập nhật bài hát thành công và đưa vào hàng đợi chờ duyệt.',
    };
  } catch (err: any) {
    console.error('updateSongAction exception:', err);
    return { success: false, error: err?.message || 'Lỗi xảy ra khi cập nhật bài hát.' };
  }
}

