import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { songId, reason, details } = body;

    if (!songId || !reason || !details?.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ thông tin báo cáo (bài hát, lý do và chi tiết).' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Nếu là báo lỗi nội dung/hợp âm mà chưa đăng nhập thì yêu cầu đăng nhập
    if (reason !== 'copyright' && !user) {
      return NextResponse.json(
        { error: 'Vui lòng đăng nhập để gửi báo cáo lỗi bài hát. Khiếu nại bản quyền có thể gửi trực tiếp mà không cần tài khoản.' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();
    const { error: insertError } = await adminClient.from('reports').insert({
      song_id: songId,
      user_id: user?.id || null,
      reason: reason === 'copyright' ? 'Vi phạm bản quyền / Yêu cầu gỡ bài' : reason,
      details: details.trim(),
      status: 'pending',
    });

    if (insertError) {
      console.error('Error inserting report:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Báo cáo của bạn đã được gửi thành công và sẽ được kiểm duyệt sớm nhất.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

