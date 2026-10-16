'use server';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createPlaylistAction(title: string, description = '', is_public = true) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để tạo playlist.' };
  }

  if (!title || !title.trim()) {
    return { success: false, error: 'Vui lòng nhập tên playlist.' };
  }

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      is_public,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Không thể tạo playlist.' };
  }

  revalidatePath('/playlist');
  return { success: true, playlistId: data.id };
}

export async function updatePlaylistAction(id: string, title: string, description = '', is_public = true) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để sửa playlist.' };
  }

  const { error } = await supabase
    .from('playlists')
    .update({
      title: title.trim(),
      description: description.trim() || null,
      is_public,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/playlist');
  revalidatePath(`/playlist/${id}`);
  return { success: true };
}

export async function deletePlaylistAction(id: string) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('playlists').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/playlist');
  return { success: true };
}

export async function addSongToPlaylistAction(playlistId: string, songId: string) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Bạn cần đăng nhập để thêm bài vào playlist.' };
  }

  // Lấy vị trí lớn nhất hiện có trong playlist
  const { data: existingSongs } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPos = (existingSongs?.[0]?.position ?? 0) + 1;

  const { error } = await supabase
    .from('playlist_songs')
    .insert({
      playlist_id: playlistId,
      song_id: songId,
      position: nextPos,
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Bài hát đã có sẵn trong playlist này.' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/playlist/${playlistId}`);
  return { success: true };
}

export async function removeSongFromPlaylistAction(playlistId: string, songId: string) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/playlist/${playlistId}`);
  return { success: true };
}

export async function reorderPlaylistAction(playlistId: string, songIds: string[]) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Chưa cấu hình Supabase.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('reorder_playlist', {
    p_playlist_id: playlistId,
    p_song_ids: songIds,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/playlist/${playlistId}`);
  return { success: true };
}

