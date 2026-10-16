'use server';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { removeVietnameseAccents } from '@/lib/search/unaccent';

export async function createSongRequestAction(title: string, artistName: string, note = '') {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để gửi yêu cầu hợp âm.' };
  }

  // 1. Kiểm tra tài khoản có bị khoá không
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned, ban_reason')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return { success: false, error: `Tài khoản đang bị khoá: ${profile.ban_reason || 'Vi phạm cộng đồng.'}` };
  }

  if (!title || !title.trim()) {
    return { success: false, error: 'Vui lòng nhập tên bài hát cần yêu cầu.' };
  }
  if (!artistName || !artistName.trim()) {
    return { success: false, error: 'Vui lòng nhập tên ca sĩ hoặc nhạc sĩ.' };
  }

  // 2. Chèn yêu cầu mới
  const { data: newReq, error: insertErr } = await supabase
    .from('song_requests')
    .insert({
      user_id: user.id,
      title: title.trim(),
      artist_name: artistName.trim(),
      note: note.trim() || null,
      status: 'pending',
      votes_count: 0,
    })
    .select('id')
    .single();

  if (insertErr || !newReq) {
    return { success: false, error: insertErr?.message || 'Lỗi khi gửi yêu cầu.' };
  }

  // 3. Tự động bỏ 1 phiếu vote ban đầu từ chính người tạo
  await supabase.from('song_request_votes').insert({
    user_id: user.id,
    request_id: newReq.id,
  });

  revalidatePath('/yeu-cau');
  return { success: true, requestId: newReq.id };
}

export async function toggleVoteAction(requestId: string) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để bình chọn.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) {
    return { success: false, error: 'Tài khoản của bạn đang bị khoá.' };
  }

  // Kiểm tra xem đã vote chưa
  const { data: existingVote } = await supabase
    .from('song_request_votes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('request_id', requestId)
    .maybeSingle();

  if (existingVote) {
    // Huỷ vote
    const { error } = await supabase
      .from('song_request_votes')
      .delete()
      .eq('user_id', user.id)
      .eq('request_id', requestId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/yeu-cau');
    return { success: true, voted: false };
  } else {
    // Bỏ phiếu vote
    const { error } = await supabase
      .from('song_request_votes')
      .insert({
        user_id: user.id,
        request_id: requestId,
      });

    if (error) return { success: false, error: error.message };
    revalidatePath('/yeu-cau');
    return { success: true, voted: true };
  }
}

export interface SimilarityResult {
  existingSongs: Array<{ id: string; title: string; slug: string; artist_name?: string }>;
  existingRequests: Array<{ id: string; title: string; artist_name: string; votes_count: number; status: string }>;
}

export async function checkSimilarityAction(titleQuery: string): Promise<SimilarityResult> {
  if (!titleQuery || titleQuery.trim().length < 2 || !isSupabaseConfigured()) {
    return { existingSongs: [], existingRequests: [] };
  }

  const supabase = await createClient();
  const cleanQ = titleQuery.trim();

  // Tìm bài hát đã có trên hệ thống
  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, slug, is_verified, takedown_status, artists:artist_id ( name )')
    .eq('is_verified', true)
    .eq('takedown_status', 'none')
    .ilike('title', `%${cleanQ}%`)
    .limit(3);

  // Tìm các yêu cầu đã gửi
  const { data: requests } = await supabase
    .from('song_requests')
    .select('id, title, artist_name, votes_count, status')
    .ilike('title', `%${cleanQ}%`)
    .limit(3);

  return {
    existingSongs: (songs || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      artist_name: s.artists?.name,
    })),
    existingRequests: (requests || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      artist_name: r.artist_name,
      votes_count: r.votes_count,
      status: r.status,
    })),
  };
}

