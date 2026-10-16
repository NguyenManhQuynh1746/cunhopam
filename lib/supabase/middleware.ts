import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Nếu chưa cấu hình Supabase, tiếp tục bình thường không báo lỗi
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project') || !supabaseUrl.startsWith('http')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    // Tự động làm mới phiên đăng nhập (refresh token)
    const { data: { user } } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Danh sách route yêu cầu đăng nhập
    const isProtected =
      pathname.startsWith('/dang-bai') ||
      pathname.startsWith('/bai-cua-toi') ||
      pathname.startsWith('/sua-bai') ||
      pathname === '/playlist/tao';

    if (isProtected && !user) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // Bỏ qua lỗi nếu mạng hoặc key chưa hợp lệ
  }

  return supabaseResponse;
}
