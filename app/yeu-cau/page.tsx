import React from 'react';
import { Metadata } from 'next';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import SongRequestClient, { RequestItemData } from '@/components/requests/SongRequestClient';

export const metadata: Metadata = {
  title: 'Yêu cầu hợp âm | cunhopam',
  description: 'Gửi yêu cầu bài hát bạn chưa tìm thấy và bình chọn những bài hát bạn muốn có hợp âm nhất.',
};

export const dynamic = 'force-dynamic';

export default async function SongRequestsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted">
        Cơ sở dữ liệu Supabase chưa được cấu hình.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Lấy danh sách yêu cầu hợp âm kèm bài hát hoàn thành (nếu có)
  const { data: requests } = await supabase
    .from('song_requests')
    .select(`
      id, title, artist_name, note, status, votes_count, created_at,
      fulfilled_song:fulfilled_song_id ( id, title, slug )
    `)
    .order('votes_count', { ascending: false })
    .order('created_at', { ascending: false });

  // 2. Lấy danh sách request_id mà người dùng hiện tại đã bình chọn
  const userVotedSet = new Set<string>();
  if (user) {
    const { data: userVotes } = await supabase
      .from('song_request_votes')
      .select('request_id')
      .eq('user_id', user.id);

    (userVotes || []).forEach((v) => userVotedSet.add(v.request_id));
  }

  const formattedRequests: RequestItemData[] = (requests || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    artist_name: r.artist_name,
    note: r.note,
    status: r.status,
    votes_count: r.votes_count,
    created_at: r.created_at,
    user_voted: userVotedSet.has(r.id),
    fulfilled_song: r.fulfilled_song,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <SongRequestClient initialRequests={formattedRequests} user={user} />
    </div>
  );
}

