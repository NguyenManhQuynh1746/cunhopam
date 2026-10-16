import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  ListMusic,
  Plus,
  Lock,
  Globe,
  Music2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import PlaylistManagerClient from '@/components/playlist/PlaylistManagerClient';

export const metadata: Metadata = {
  title: 'Playlist của tôi | cunhopam',
  description: 'Quản lý các danh sách bài hát yêu thích, biểu diễn và tập luyện cá nhân.',
};

export const dynamic = 'force-dynamic';

export default async function PlaylistIndexPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted">
        Cơ sở dữ liệu Supabase chưa được cấu hình.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/playlist');
  }

  // Lấy danh sách playlist của người dùng kèm số lượng bài hát
  const { data: playlists } = await supabase
    .from('playlists')
    .select(`
      id, title, description, is_public, created_at, updated_at,
      playlist_songs ( count )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const formattedPlaylists = (playlists || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    is_public: p.is_public,
    created_at: p.created_at,
    song_count: p.playlist_songs?.[0]?.count ?? 0,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <PlaylistManagerClient initialPlaylists={formattedPlaylists} />
    </div>
  );
}
