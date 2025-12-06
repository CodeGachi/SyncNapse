/**
 * AccountDeleteConfirmModal 컴포넌트 테스트
 * 계정 삭제 확인 모달
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountDeleteConfirmModal } from "@/components/dashboard/account-delete-confirm-modal";

describe("AccountDeleteConfirmModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  describe("렌더링", () => {
    it("계정 삭제 제목", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "계정 삭제" })).toBeInTheDocument();
      });
    });

    it("되돌릴 수 없음 경고", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("이 작업은 되돌릴 수 없습니다")).toBeInTheDocument();
      });
    });

    it("삭제될 데이터 목록", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("모든 노트 및 폴더")).toBeInTheDocument();
        expect(screen.getByText("녹음 파일 및 변환된 텍스트")).toBeInTheDocument();
        expect(screen.getByText("프로필 정보")).toBeInTheDocument();
      });
    });

    it("30일 복구 기간 안내", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("30일 복구 기간")).toBeInTheDocument();
      });
    });
  });

  describe("확인 입력", () => {
    it("확인 문구 입력 필드", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("내 계정을 삭제합니다")).toBeInTheDocument();
      });
    });

    it("확인 문구 미입력 시 삭제 버튼 비활성화", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: "계정 삭제" });
        expect(deleteButton).toBeDisabled();
      });
    });

    it("잘못된 확인 문구 시 삭제 버튼 비활성화", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("내 계정을 삭제합니다")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("내 계정을 삭제합니다"), {
        target: { value: "잘못된 입력" },
      });

      const deleteButton = screen.getByRole("button", { name: "계정 삭제" });
      expect(deleteButton).toBeDisabled();
    });

    it("올바른 확인 문구 입력 시 삭제 버튼 활성화", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("내 계정을 삭제합니다")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("내 계정을 삭제합니다"), {
        target: { value: "내 계정을 삭제합니다" },
      });

      const deleteButton = screen.getByRole("button", { name: "계정 삭제" });
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe("버튼 동작", () => {
    it("취소 버튼 클릭 시 onClose 호출", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "취소" }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("삭제 버튼 클릭 시 onDelete 호출", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("내 계정을 삭제합니다")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("내 계정을 삭제합니다"), {
        target: { value: "내 계정을 삭제합니다" },
      });

      fireEvent.click(screen.getByRole("button", { name: "계정 삭제" }));

      await waitFor(() => {
        expect(defaultProps.onDelete).toHaveBeenCalled();
      });
    });
  });

  describe("ESC 키 동작", () => {
    it("ESC 키 누르면 onClose 호출", async () => {
      render(<AccountDeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "계정 삭제" })).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: "Escape" });

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("모달 닫힘", () => {
    it("isOpen=false일 때 렌더링 안함", () => {
      render(<AccountDeleteConfirmModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("계정 삭제")).not.toBeInTheDocument();
    });
  });
});
