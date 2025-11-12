import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware disabled - authentication is handled client-side
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 올바른 쿠키 키 사용
  const authToken = request.cookies.get("syncnapse_access_token")?.value;

  // 로그인 페이지 접근 시 이미 로그인되어 있으면 대시보드로 리다이렉트
  if (pathname === "/") {
    if (authToken) {
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
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/note/:path*"],
};
