/**
 * 사용자 레이아웃 (Server Component)
 *
 * 인증된 사용자만 접근 가능한 페이지의 공통 레이아웃
 */

import { AuthGuard } from "@/components/auth/auth-guard";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
