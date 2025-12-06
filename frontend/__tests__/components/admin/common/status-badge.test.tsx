/**
 * StatusBadge 컴포넌트들 테스트
 * 다양한 상태 뱃지
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  UserStatusBadge,
  RoleBadge,
  PlanStatusBadge,
  SubscriptionStatusBadge,
  ServerStatusBadge,
  AlertTypeBadge,
} from "@/components/admin/common/status-badge";
import { MantineProvider } from "@mantine/core";

// Wrapper component for Mantine
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe("UserStatusBadge", () => {
  it("활성 상태", () => {
    render(<UserStatusBadge status="active" />, { wrapper: TestWrapper });
    expect(screen.getByText("활성")).toBeInTheDocument();
  });

  it("비활성 상태", () => {
    render(<UserStatusBadge status="inactive" />, { wrapper: TestWrapper });
    expect(screen.getByText("비활성")).toBeInTheDocument();
  });

  it("정지 상태", () => {
    render(<UserStatusBadge status="suspended" />, { wrapper: TestWrapper });
    expect(screen.getByText("정지")).toBeInTheDocument();
  });

  it("차단 상태", () => {
    render(<UserStatusBadge status="banned" />, { wrapper: TestWrapper });
    expect(screen.getByText("차단")).toBeInTheDocument();
  });
});

describe("RoleBadge", () => {
  it("관리자 역할", () => {
    render(<RoleBadge role="admin" />, { wrapper: TestWrapper });
    expect(screen.getByText("관리자")).toBeInTheDocument();
  });

  it("운영자 역할", () => {
    render(<RoleBadge role="operator" />, { wrapper: TestWrapper });
    expect(screen.getByText("운영자")).toBeInTheDocument();
  });

  it("사용자 역할", () => {
    render(<RoleBadge role="user" />, { wrapper: TestWrapper });
    expect(screen.getByText("사용자")).toBeInTheDocument();
  });
});

describe("PlanStatusBadge", () => {
  it("활성 상태", () => {
    render(<PlanStatusBadge status="active" />, { wrapper: TestWrapper });
    expect(screen.getByText("활성")).toBeInTheDocument();
  });

  it("비활성 상태", () => {
    render(<PlanStatusBadge status="inactive" />, { wrapper: TestWrapper });
    expect(screen.getByText("비활성")).toBeInTheDocument();
  });

  it("지원 종료 상태", () => {
    render(<PlanStatusBadge status="deprecated" />, { wrapper: TestWrapper });
    expect(screen.getByText("지원 종료")).toBeInTheDocument();
  });
});

describe("SubscriptionStatusBadge", () => {
  it("활성 상태", () => {
    render(<SubscriptionStatusBadge status="active" />, { wrapper: TestWrapper });
    expect(screen.getByText("활성")).toBeInTheDocument();
  });

  it("취소됨 상태", () => {
    render(<SubscriptionStatusBadge status="cancelled" />, { wrapper: TestWrapper });
    expect(screen.getByText("취소됨")).toBeInTheDocument();
  });

  it("연체 상태", () => {
    render(<SubscriptionStatusBadge status="past_due" />, { wrapper: TestWrapper });
    expect(screen.getByText("연체")).toBeInTheDocument();
  });
});

describe("ServerStatusBadge", () => {
  it("정상 상태", () => {
    render(<ServerStatusBadge status="healthy" />, { wrapper: TestWrapper });
    expect(screen.getByText("정상")).toBeInTheDocument();
  });

  it("주의 상태", () => {
    render(<ServerStatusBadge status="warning" />, { wrapper: TestWrapper });
    expect(screen.getByText("주의")).toBeInTheDocument();
  });

  it("오류 상태", () => {
    render(<ServerStatusBadge status="error" />, { wrapper: TestWrapper });
    expect(screen.getByText("오류")).toBeInTheDocument();
  });
});

describe("AlertTypeBadge", () => {
  it("정보 타입", () => {
    render(<AlertTypeBadge type="info" />, { wrapper: TestWrapper });
    expect(screen.getByText("정보")).toBeInTheDocument();
  });

  it("경고 타입", () => {
    render(<AlertTypeBadge type="warning" />, { wrapper: TestWrapper });
    expect(screen.getByText("경고")).toBeInTheDocument();
  });

  it("오류 타입", () => {
    render(<AlertTypeBadge type="error" />, { wrapper: TestWrapper });
    expect(screen.getByText("오류")).toBeInTheDocument();
  });
});
