/**
 * ConfirmModal 컴포넌트 테스트
 * 확인 모달 및 특화된 모달들
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ConfirmModal,
  SuspendUserModal,
  BanUserModal,
  ActivateUserModal,
  DeletePlanModal,
} from "@/components/admin/common/confirm-modal";
import { MantineProvider } from "@mantine/core";

// Wrapper component for Mantine
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

describe("ConfirmModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: "확인 모달",
    message: "이 작업을 진행하시겠습니까?",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("모달 제목 표시", () => {
      render(<ConfirmModal {...defaultProps} />, { wrapper: TestWrapper });

      expect(screen.getByText("확인 모달")).toBeInTheDocument();
    });

    it("모달 메시지 표시", () => {
      render(<ConfirmModal {...defaultProps} />, { wrapper: TestWrapper });

      expect(screen.getByText("이 작업을 진행하시겠습니까?")).toBeInTheDocument();
    });

    it("기본 버튼 텍스트", () => {
      render(<ConfirmModal {...defaultProps} />, { wrapper: TestWrapper });

      expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
    });

    it("커스텀 버튼 텍스트", () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmText="삭제"
          cancelText="돌아가기"
        />,
        { wrapper: TestWrapper }
      );

      expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "돌아가기" })).toBeInTheDocument();
    });
  });

  describe("버튼 동작", () => {
    it("확인 버튼 클릭", () => {
      render(<ConfirmModal {...defaultProps} />, { wrapper: TestWrapper });

      fireEvent.click(screen.getByRole("button", { name: "확인" }));

      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });

    it("취소 버튼 클릭", () => {
      render(<ConfirmModal {...defaultProps} />, { wrapper: TestWrapper });

      fireEvent.click(screen.getByRole("button", { name: "취소" }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("로딩 상태", () => {
    it("로딩 중 취소 버튼 비활성화", () => {
      render(<ConfirmModal {...defaultProps} loading />, { wrapper: TestWrapper });

      expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    });
  });

  describe("위험 모드", () => {
    it("danger=true일 때 경고 아이콘", () => {
      render(<ConfirmModal {...defaultProps} danger />, { wrapper: TestWrapper });

      // 위험 모드에서는 AlertTriangle 아이콘 사용
      // 모달이 렌더링되는지 확인
      expect(screen.getByText("확인 모달")).toBeInTheDocument();
    });
  });

  describe("모달 닫힘", () => {
    it("opened=false일 때 렌더링 안함", () => {
      render(<ConfirmModal {...defaultProps} opened={false} />, {
        wrapper: TestWrapper,
      });

      expect(screen.queryByText("확인 모달")).not.toBeInTheDocument();
    });
  });
});

describe("SuspendUserModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    userName: "테스트 사용자",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("정지 제목 표시", () => {
    render(<SuspendUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText("사용자 정지")).toBeInTheDocument();
  });

  it("사용자 이름 포함 메시지", () => {
    render(<SuspendUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText(/테스트 사용자.*정지/)).toBeInTheDocument();
  });

  it("정지 확인 버튼", () => {
    render(<SuspendUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByRole("button", { name: "정지" })).toBeInTheDocument();
  });
});

describe("BanUserModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    userName: "차단할 사용자",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("차단 제목 표시", () => {
    render(<BanUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText("사용자 차단")).toBeInTheDocument();
  });

  it("사용자 이름 포함 메시지", () => {
    render(<BanUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText(/차단할 사용자.*영구 차단/)).toBeInTheDocument();
  });

  it("영구 차단 확인 버튼", () => {
    render(<BanUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByRole("button", { name: "영구 차단" })).toBeInTheDocument();
  });
});

describe("ActivateUserModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    userName: "활성화할 사용자",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("활성화 제목 표시", () => {
    render(<ActivateUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText("사용자 활성화")).toBeInTheDocument();
  });

  it("사용자 이름 포함 메시지", () => {
    render(<ActivateUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText(/활성화할 사용자.*활성화/)).toBeInTheDocument();
  });

  it("활성화 확인 버튼", () => {
    render(<ActivateUserModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByRole("button", { name: "활성화" })).toBeInTheDocument();
  });
});

describe("DeletePlanModal", () => {
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    planName: "프리미엄 요금제",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("삭제 제목 표시", () => {
    render(<DeletePlanModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText("요금제 삭제")).toBeInTheDocument();
  });

  it("요금제 이름 포함 메시지", () => {
    render(<DeletePlanModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByText(/프리미엄 요금제.*삭제/)).toBeInTheDocument();
  });

  it("삭제 확인 버튼", () => {
    render(<DeletePlanModal {...defaultProps} />, { wrapper: TestWrapper });

    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });
});
