'use server';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function verifyAdminCaller() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase chưa được cấu hình.');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Chưa đăng nhập.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Bạn không có quyền quản trị viên.');
  }

  return { supabase, user };
}

function revalidateSongCaches(slug?: string) {
  revalidatePath('/');
  revalidatePath('/tim-theo-hop-am');
  revalidatePath('/hop-am');
  revalidatePath('/dieu/[slug]', 'page');
  revalidatePath('/the-loai/[slug]', 'page');
  revalidatePath('/ca-si/[slug]', 'page');
  if (slug) {
    revalidatePath(`/bai-hat/${slug}`);
  }
}

export async function adminVerifySongAction(songId: string, songSlug?: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_verify_song', { p_song_id: songId });
    if (error) return { success: false, error: error.message };

    revalidateSongCaches(songSlug);
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminRejectSongAction(songId: string, reason: string, songSlug?: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_reject_song', {
      p_song_id: songId,
      p_reason: reason,
    });
    if (error) return { success: false, error: error.message };

    revalidateSongCaches(songSlug);
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminTakedownSongAction(songId: string, status: string, reason?: string, songSlug?: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_takedown_song', {
      p_song_id: songId,
      p_status: status,
      p_reason: reason || null,
    });
    if (error) return { success: false, error: error.message };

    revalidateSongCaches(songSlug);
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminToggleHideCommentAction(commentId: string, isHidden: boolean, reason?: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_toggle_hide_comment', {
      p_comment_id: commentId,
      p_is_hidden: isHidden,
      p_reason: reason || null,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminDeleteCommentAction(commentId: string, reason?: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_delete_comment', {
      p_comment_id: commentId,
      p_reason: reason || null,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminBanUserAction(userId: string, reason: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_ban_user', {
      p_user_id: userId,
      p_reason: reason,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminUnbanUserAction(userId: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_unban_user', {
      p_user_id: userId,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminApproveRevisionAction(revisionId: string, songSlug?: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_approve_revision', {
      p_revision_id: revisionId,
    });
    if (error) return { success: false, error: error.message };

    revalidateSongCaches(songSlug);
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminRejectRevisionAction(revisionId: string, reason: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_reject_revision', {
      p_revision_id: revisionId,
      p_reason: reason,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminRestoreRevisionAction(revisionId: string, songSlug?: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { data: newRevId, error } = await supabase.rpc('admin_restore_revision', {
      p_revision_id: revisionId,
    });
    if (error) return { success: false, error: error.message };

    revalidateSongCaches(songSlug);
    revalidatePath('/admin');
    return { success: true, newRevisionId: newRevId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminResolveReportAction(
  reportId: string,
  status: string,
  note?: string,
  takedown = false,
  songSlug?: string
) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: reportId,
      p_status: status,
      p_note: note || null,
      p_takedown: takedown,
    });
    if (error) return { success: false, error: error.message };

    if (takedown) {
      revalidateSongCaches(songSlug);
    }
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminFulfillRequestAction(requestId: string, songId: string) {
  try {
    const { supabase } = await verifyAdminCaller();
    const { error } = await supabase.rpc('admin_fulfill_request', {
      p_request_id: requestId,
      p_song_id: songId,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath('/yeu-cau');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

