"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  IconDashboard,
  IconUsers,
  IconCreditCard,
  IconChartBar,
  IconSettings,
  IconArrowLeft,
  IconServer,
} from "@tabler/icons-react";
import { NavLink, Stack, Text, Divider, Box } from "@mantine/core";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
}

const adminNavItems: NavItem[] = [
  {
    label: "운영 대시보드",
    href: "/admin",
    icon: <IconDashboard size={20} />,
    description: "시스템 상태 및 개요",
  },
  {
    label: "사용자 관리",
    href: "/admin/users",
    icon: <IconUsers size={20} />,
    description: "사용자 조회 및 관리",
  },
  {
    label: "요금제 관리",
    href: "/admin/plans",
    icon: <IconCreditCard size={20} />,
    description: "요금제 설정 및 관리",
  },
  {
    label: "구독 분석",
    href: "/admin/subscriptions",
    icon: <IconChartBar size={20} />,
    description: "구독 현황 및 통계",
  },
  {
    label: "서버 상태",
    href: "/admin/servers",
    icon: <IconServer size={20} />,
    description: "서버 모니터링",
  },
  {
    label: "시스템 설정",
    href: "/admin/settings",
    icon: <IconSettings size={20} />,
    description: "시스템 환경 설정",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <Box
      component="nav"
      w={260}
      h="100vh"
      bg="dark.8"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        borderRight: "1px solid var(--mantine-color-dark-6)",
        zIndex: 100,
      }}
    >
      {/* 로고 영역 */}
      <Box p="md" pb="sm">
        <Text size="lg" fw={700} c="white">
          SyncNapse
        </Text>
        <Text size="xs" c="dimmed">
          Admin Console
        </Text>
      </Box>

      <Divider color="dark.6" />

      {/* 네비게이션 */}
      <Stack gap={4} p="sm">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            description={item.description}
            leftSection={item.icon}
            active={isActive(item.href)}
            variant="filled"
            styles={{
              root: {
                borderRadius: "var(--mantine-radius-md)",
                "&[data-active]": {
                  backgroundColor: "var(--mantine-color-blue-8)",
                },
              },
              label: {
                fontWeight: 500,
              },
              description: {
                fontSize: "11px",
              },
            }}
          />
        ))}
      </Stack>

      {/* 하단 - 대시보드로 돌아가기 */}
      <Box
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid var(--mantine-color-dark-6)",
        }}
        p="sm"
      >
        <NavLink
          component={Link}
          href="/dashboard/main"
          label="대시보드로 돌아가기"
          leftSection={<IconArrowLeft size={20} />}
          variant="subtle"
          styles={{
            root: {
              borderRadius: "var(--mantine-radius-md)",
              "&:hover": {
                backgroundColor: "var(--mantine-color-dark-6)",
              },
            },
          }}
        />
      </Box>
    </Box>
  );
}
