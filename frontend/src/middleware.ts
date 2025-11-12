import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware disabled - authentication is handled client-side
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // OAuth 콜백 페이지는 항상 허용 (토큰 처리를 위해)
  if (pathname === "/auth/callback") {
    return NextResponse.next();
  }

  // 올바른 쿠키 키 사용
  const authToken = request.cookies.get("authToken")?.value;

  // 로그인 페이지 접근 시 이미 로그인되어 있으면 대시보드로 리다이렉트
  if (pathname === "/") {
    if (authToken) {
      console.log("[Middleware] Already authenticated, redirecting to dashboard");
      return NextResponse.redirect(new URL("/dashboard/main", request.url));
    }
    return NextResponse.next();
  }

  // 보호된 경로 접근 시 인증 확인
  const protectedRoutes = ["/dashboard", "/note"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !authToken) {
    console.log("[Middleware] Protected route without auth, redirecting to login");
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/callback", "/dashboard/:path*", "/note/:path*"],
};
