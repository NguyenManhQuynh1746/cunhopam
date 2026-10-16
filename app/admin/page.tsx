import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Bảng Quản trị Admin | cunhopam',
  description: 'Quản trị hệ thống, kiểm duyệt bài hát và khiếu nại bản quyền.',
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // BẢO VỆ TUYỆT ĐỐI: Người dùng không đăng nhập hoặc không phải Admin nhận 404
  if (!user) {
    notFound();
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    notFound();
  }

  const adminClient = createAdminClient();

  // 1. Bài hát chờ duyệt
  const { data: rawPendingSongs, error: songErr } = await adminClient
    .from('songs')
    .select(`
      id, title, slug, key, content, license_type, rights_holder,
      source_url, license_note, created_by, created_at,
      artists:artist_id ( name )
    `)
    .eq('is_verified', false)
    .eq('takedown_status', 'none')
    .order('created_at', { ascending: false });

  if (songErr) {
    console.error('Error fetching pending songs:', songErr);
  }

  // 2. Phiên bản sửa đổi chờ duyệt
  const { data: pendingRevisions } = await adminClient
    .from('song_revisions')
    .select(`
      id, song_id, revised_by, title, key, content, reason, status, created_at,
      song:songs ( id, title, slug )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // 3. Báo cáo & Khiếu nại bản quyền
  const { data: reports } = await adminClient
    .from('reports')
    .select(`
      id, song_id, reason, details, status, ip_address, created_at,
      song:songs ( id, title, slug )
    `)
    .order('created_at', { ascending: false });

  // 4. Bình luận gần đây
  const { data: rawComments } = await adminClient
    .from('comments')
    .select(`
      id, song_id, user_id, content, is_hidden, created_at,
      song:songs ( id, title, slug )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  // 5. Danh sách thành viên
  const { data: users } = await adminClient
    .from('profiles')
    .select('id, full_name, role, is_banned, ban_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  // 6. Toàn bộ lịch sử phiên bản
  const { data: rawAllRevisions } = await adminClient
    .from('song_revisions')
    .select(`
      id, song_id, revised_by, title, key, content, reason, status, created_at,
      song:songs ( id, title, slug )
    `)
    .order('created_at', { ascending: false })
    .limit(30);

  // 7. Nhật ký admin_logs
  const { data: adminLogs } = await adminClient
    .from('admin_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // 8. Yêu cầu hợp âm đang chờ
  const { data: pendingRequests } = await adminClient
    .from('song_requests')
    .select('id, title, artist_name, votes_count')
    .eq('status', 'pending')
    .order('votes_count', { ascending: false })
    .limit(20);

  // Ghép nối tên hiển thị từ bảng profiles một cách an toàn và chính xác
  const userIdsToFetch = new Set<string>();
  (rawPendingSongs || []).forEach((s) => s.created_by && userIdsToFetch.add(s.created_by));
  (rawComments || []).forEach((c) => c.user_id && userIdsToFetch.add(c.user_id));
  (rawAllRevisions || []).forEach((r) => r.revised_by && userIdsToFetch.add(r.revised_by));

  let extraProfiles: any[] = [];
  if (userIdsToFetch.size > 0) {
    const { data } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(userIdsToFetch));
    if (data) extraProfiles = data;
  }

  const profileMap = new Map<string, string>();
  (users || []).forEach((u) => profileMap.set(u.id, u.full_name || 'Thành viên'));
  extraProfiles.forEach((p) => profileMap.set(p.id, p.full_name || 'Thành viên'));

  const pendingSongs = (rawPendingSongs || []).map((s) => ({
    ...s,
    profiles: { full_name: profileMap.get(s.created_by) || 'Thành viên' },
  }));

  const comments = (rawComments || []).map((c) => ({
    ...c,
    profiles: { full_name: profileMap.get(c.user_id) || 'Thành viên' },
  }));

  const allRevisions = (rawAllRevisions || []).map((r) => ({
    ...r,
    profiles: { full_name: profileMap.get(r.revised_by) || 'Thành viên' },
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      <AdminDashboardClient
        currentUserId={user.id}
        pendingSongs={pendingSongs}
        pendingRevisions={pendingRevisions || []}
        reports={reports || []}
        recentComments={comments}
        users={users || []}
        allRevisions={allRevisions}
        adminLogs={adminLogs || []}
        pendingRequests={pendingRequests || []}
      />
    </div>
  );
}

