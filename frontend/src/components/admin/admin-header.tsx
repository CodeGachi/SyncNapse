"use client";

import { useAuth } from "@/features/auth/use-auth";
import { useIsAdmin } from "./admin-guard";
import {
  Group,
  Avatar,
  Text,
  Menu,
  Badge,
  Box,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import {
  IconUser,
  IconLogout,
  IconChevronRight,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const routeLabels: Record<string, string> = {
  admin: "관리자",
  users: "사용자 관리",
  plans: "요금제 관리",
  subscriptions: "구독 분석",
  servers: "서버 상태",
  settings: "시스템 설정",
};

export function AdminHeader() {
  const { user } = useAuth();
  const { role } = useIsAdmin();
  const pathname = usePathname();
  const router = useRouter();

  // 브레드크럼 생성
  const breadcrumbs = generateBreadcrumbs(pathname);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <Box
      component="header"
      h={60}
      bg="dark.9"
      style={{
        position: "fixed",
        top: 0,
        left: 260,
        right: 0,
        borderBottom: "1px solid var(--mantine-color-dark-6)",
        zIndex: 99,
      }}
    >
      <Group h="100%" px="md" justify="space-between">
        {/* 브레드크럼 */}
        <Breadcrumbs
          separator={<IconChevronRight size={14} color="gray" />}
          separatorMargin={8}
        >
          {breadcrumbs.map((item, index) =>
            item.href ? (
              <Anchor
                key={index}
                component={Link}
                href={item.href}
                size="sm"
                c="dimmed"
                fw={400}
                underline="never"
              >
                {item.label}
              </Anchor>
            ) : (
              <Text
                key={index}
                size="sm"
                c="white"
                fw={500}
              >
                {item.label}
              </Text>
            )
          )}
        </Breadcrumbs>

        {/* 우측 영역 */}
        <Group gap="md">
          {/* 사용자 메뉴 */}
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <Group gap="sm" style={{ cursor: "pointer" }}>
                <Avatar
                  src={user?.picture}
                  alt={user?.name}
                  radius="xl"
                  size="sm"
                >
                  {user?.name?.charAt(0)}
                </Avatar>
                <Box visibleFrom="sm">
                  <Text size="sm" fw={500} c="white" lh={1.2}>
                    {user?.name || "관리자"}
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color="blue"
                  >
                    관리자
                  </Badge>
                </Box>
              </Group>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>계정</Menu.Label>
              <Menu.Item
                leftSection={<IconUser size={16} />}
                component={Link}
                href="/dashboard/profile"
              >
                프로필
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                color="red"
                onClick={handleLogout}
              >
                로그아웃
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    const label = routeLabels[segment] || segment;
    const isLast = i === segments.length - 1;

    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return breadcrumbs;
}
