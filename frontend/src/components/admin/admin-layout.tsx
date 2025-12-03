"use client";

import { Box } from "@mantine/core";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";
import { AdminGuard } from "./admin-guard";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * 관리자 페이지 레이아웃
 *
 * - AdminGuard로 권한 확인
 * - 왼쪽 사이드바 (260px)
 * - 상단 헤더 (60px)
 * - 메인 콘텐츠 영역
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <Box bg="dark.9" mih="100vh">
        {/* 사이드바 */}
        <AdminSidebar />

        {/* 헤더 */}
        <AdminHeader />

        {/* 메인 콘텐츠 */}
        <Box
          component="main"
          ml={260}
          pt={84}
          px="lg"
          pb="lg"
          mih="100vh"
          style={{
            backgroundColor: "var(--mantine-color-dark-9)",
          }}
        >
          {children}
        </Box>
      </Box>
    </AdminGuard>
  );
}
