"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/use-auth";
import { LoadingScreen } from "@/components/common/loading-screen";
import type { UserRole } from "@/lib/api/types/admin.types";

interface AdminGuardProps {
  children: React.ReactNode;
  /** 허용할 역할 목록 (기본값: admin, operator) */
  allowedRoles?: UserRole[];
  /** 권한 없을 때 리다이렉트할 경로 */
  redirectTo?: string;
}

/**
 * 관리자/운영자 권한 확인 가드 컴포넌트
 *
 * - 인증되지 않은 경우 로그인 페이지로 리다이렉트
 * - 권한이 없는 경우 지정된 경로로 리다이렉트
 *
 * Mock 모드에서는 사용자 역할을 localStorage에서 확인:
 * - localStorage.setItem('mockUserRole', 'admin') // admin, operator, user
 */
export function AdminGuard({
  children,
  allowedRoles = ["admin", "operator"],
  redirectTo = "/dashboard/main",
}: AdminGuardProps) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (loading) return;

    // 인증되지 않은 경우
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    // 역할 확인 (Mock 모드 지원)
    const userRole = getUserRole(user);

    if (allowedRoles.includes(userRole)) {
      setIsAuthorized(true);
    } else {
      // 권한 없음 - 리다이렉트
      router.replace(redirectTo);
    }

    setCheckingAuth(false);
  }, [loading, isAuthenticated, user, allowedRoles, redirectTo, router]);

  // 로딩 중
  if (loading || checkingAuth) {
    return <LoadingScreen message="권한을 확인하고 있습니다..." fullScreen />;
  }

  // 권한 없음 (리다이렉트 진행 중)
  if (!isAuthorized) {
    return <LoadingScreen message="페이지를 이동하고 있습니다..." fullScreen />;
  }

  return <>{children}</>;
}

/**
 * 사용자의 역할을 가져옵니다.
 *
 * 1. 사용자 객체에 role 필드가 있으면 사용
 * 2. Mock 모드: localStorage의 mockUserRole 확인
 * 3. 개발 모드 기본값: NEXT_PUBLIC_DEFAULT_ADMIN_ROLE 환경변수
 * 4. 기본값: 'user'
 */
function getUserRole(user: unknown): UserRole {
  // 사용자 객체에 role이 있는 경우
  if (user && typeof user === "object" && "role" in user) {
    const userObj = user as { role?: string };
    if (userObj.role && ["admin", "operator", "user"].includes(userObj.role)) {
      return userObj.role as UserRole;
    }
  }

  // Mock 모드 - localStorage에서 역할 확인
  if (typeof window !== "undefined") {
    const mockRole = localStorage.getItem("mockUserRole");
    if (mockRole && ["admin", "operator", "user"].includes(mockRole)) {
      return mockRole as UserRole;
    }
  }

  // 개발 모드 기본값 (환경변수)
  const defaultRole = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_ROLE;
  if (defaultRole && ["admin", "operator", "user"].includes(defaultRole)) {
    return defaultRole as UserRole;
  }

  // 기본값
  return "user";
}

/**
 * 관리자 권한만 허용하는 가드
 */
export function AdminOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard allowedRoles={["admin"]}>
      {children}
    </AdminGuard>
  );
}

/**
 * 현재 사용자가 관리자/운영자인지 확인하는 훅
 */
export function useIsAdmin(): { isAdmin: boolean; isOperator: boolean; role: UserRole; loading: boolean } {
  const { user, loading } = useAuth();
  const [role, setRole] = useState<UserRole>("user");

  useEffect(() => {
    if (!loading && user) {
      setRole(getUserRole(user));
    }
  }, [loading, user]);

  return {
    isAdmin: role === "admin",
    isOperator: role === "operator",
    role,
    loading,
  };
}
