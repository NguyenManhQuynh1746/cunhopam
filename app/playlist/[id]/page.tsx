import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import PlaylistDetailClient from '@/components/playlist/PlaylistDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return { title: 'Playlist | cunhopam' };
  }

  const supabase = await createClient();
  const { data: playlist } = await supabase
    .from('playlists')
    .select('title')
    .eq('id', id)
    .maybeSingle();

  if (!playlist) {
    return { title: 'Không tìm thấy playlist | cunhopam' };
  }

  return {
    title: `${playlist.title} – Playlist biểu diễn | cunhopam`,
    description: `Xem danh sách bài hát và hợp âm trong playlist "${playlist.title}" trên cunhopam.`,
  };
}

export default async function PlaylistDetailPage({ params }: Props) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Truy vấn Playlist
  const { data: playlist, error: plErr } = await supabase
    .from('playlists')
    .select('id, title, description, is_public, user_id, created_at')
    .eq('id', id)
    .maybeSingle();

  if (plErr || !playlist) {
    notFound();
  }

  // Lấy quyền admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  const isOwner = user?.id === playlist.user_id;

  // Nếu playlist riêng tư và người xem không phải chủ sở hữu cũng không phải admin -> 404
  if (!playlist.is_public && !isOwner && !isAdmin) {
    notFound();
  }

  // 2. Truy vấn danh sách bài hát trong Playlist
  // Lọc chỉ các bài hát hợp lệ (is_verified = true, takedown_status = 'none' hoặc tác giả bài)
  const { data: songLinks } = await supabase
    .from('playlist_songs')
    .select(`
      id, song_id, position,
      song:songs (
        id, title, slug, key, content, is_verified, takedown_status, created_by,
        artists:artist_id ( name )
      )
    `)
    .eq('playlist_id', id)
    .order('position', { ascending: true });

  const validSongs = (songLinks || [])
    .filter((item: any) => {
      const s = item.song;
      if (!s) return false;
      const isSongVerified = s.is_verified === true && s.takedown_status === 'none';
      const isSongAuthor = user && s.created_by === user.id;
      return isSongVerified || isSongAuthor || isAdmin;
    })
    .map((item: any) => ({
      id: item.id,
      song_id: item.song_id,
      position: item.position,
      song: {
        id: item.song.id,
        title: item.song.title,
        slug: item.song.slug,
        key: item.song.key,
        content: item.song.content,
        artist_name: item.song.artists?.name || null,
      },
    }));

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <PlaylistDetailClient
        playlist={playlist}
        initialSongs={validSongs}
        isOwner={isOwner || isAdmin}
      />
    </div>
  );
}

