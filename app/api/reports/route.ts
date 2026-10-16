import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Bộ nhớ đệm kiểm soát tần suất gửi báo cáo theo IP (Rate Limit in-memory)
// Tối đa 3 lượt gửi trong vòng 10 phút cho mỗi địa chỉ IP
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 phút
const MAX_REPORTS_PER_WINDOW = 3;
const ipRequestHistory = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestHistory.get(ip) || [];

  // Lọc bỏ các timestamp cũ hơn 10 phút
  const recentTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recentTimestamps.length >= MAX_REPORTS_PER_WINDOW) {
    ipRequestHistory.set(ip, recentTimestamps);
    return true;
  }

  recentTimestamps.push(now);
  ipRequestHistory.set(ip, recentTimestamps);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Xác định địa chỉ IP của người gửi
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';

    // 2. Kiểm tra giới hạn tần suất theo IP (đặc biệt bảo vệ khiếu nại công khai không cần đăng nhập)
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error:
            'Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng đợi 10 phút trước khi gửi tiếp để tránh quá tải hệ thống.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { songId, reason, details } = body;

    if (!songId || !reason || !details?.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp đầy đủ thông tin báo cáo (bài hát, lý do và chi tiết).' },
        { status: 400 }
      );
    }

    if (details.trim().length > 1500) {
      return NextResponse.json(
        { error: 'Nội dung chi tiết không được vượt quá 1.500 ký tự.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Nếu là báo lỗi nội dung/hợp âm mà chưa đăng nhập thì yêu cầu đăng nhập
    if (reason !== 'copyright' && !user) {
      return NextResponse.json(
        {
          error:
            'Vui lòng đăng nhập để gửi báo cáo lỗi bài hát. Khiếu nại bản quyền có thể gửi trực tiếp mà không cần tài khoản.',
        },
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

    return NextResponse.json({
      success: true,
      message: 'Báo cáo của bạn đã được gửi thành công và sẽ được kiểm duyệt sớm nhất.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
