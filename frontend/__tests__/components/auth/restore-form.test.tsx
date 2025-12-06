/**
 * RestoreForm 컴포넌트 테스트
 * 계정 복구 폼
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RestoreForm } from "@/components/auth/restore-form";

// useRestoreForm mock
const mockUseRestoreForm = vi.fn();
vi.mock("@/features/auth/use-restore-form", () => ({
  useRestoreForm: () => mockUseRestoreForm(),
}));

describe("RestoreForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("토큰 없음", () => {
    beforeEach(() => {
      mockUseRestoreForm.mockReturnValue({
        hasToken: false,
        status: "idle",
        errorMessage: "",
        showDeleteConfirm: false,
        handleRestore: vi.fn(),
        handleDelete: vi.fn(),
        openDeleteConfirm: vi.fn(),
        closeDeleteConfirm: vi.fn(),
      });
    });

    it("유효하지 않은 접근 메시지", () => {
      render(<RestoreForm />);

      expect(screen.getByText("유효하지 않은 접근입니다")).toBeInTheDocument();
    });

    it("토큰 없음 설명", () => {
      render(<RestoreForm />);

      expect(screen.getByText("복구 토큰이 제공되지 않았습니다.")).toBeInTheDocument();
    });

    it("로그인 페이지 링크", () => {
      render(<RestoreForm />);

      const link = screen.getByRole("link", { name: "로그인 페이지로 이동" });
      expect(link).toHaveAttribute("href", "/login");
    });
  });

  describe("복구 성공", () => {
    beforeEach(() => {
      mockUseRestoreForm.mockReturnValue({
        hasToken: true,
        status: "success",
        errorMessage: "",
        showDeleteConfirm: false,
        handleRestore: vi.fn(),
        handleDelete: vi.fn(),
        openDeleteConfirm: vi.fn(),
        closeDeleteConfirm: vi.fn(),
      });
    });

    it("복구 완료 메시지", () => {
      render(<RestoreForm />);

      expect(screen.getByText("계정 복구 완료!")).toBeInTheDocument();
    });

    it("리다이렉트 안내", () => {
      render(<RestoreForm />);

      expect(screen.getByText("잠시 후 로그인 페이지로 이동합니다...")).toBeInTheDocument();
    });
  });

  describe("기본 상태 (복구/삭제 선택)", () => {
    const mockHandleRestore = vi.fn();
    const mockOpenDeleteConfirm = vi.fn();

    beforeEach(() => {
      mockUseRestoreForm.mockReturnValue({
        hasToken: true,
        status: "idle",
        errorMessage: "",
        showDeleteConfirm: false,
        handleRestore: mockHandleRestore,
        handleDelete: vi.fn(),
        openDeleteConfirm: mockOpenDeleteConfirm,
        closeDeleteConfirm: vi.fn(),
      });
    });

    it("삭제 요청된 계정 메시지", () => {
      render(<RestoreForm />);

      expect(screen.getByText("삭제 요청된 계정입니다")).toBeInTheDocument();
    });

    it("데이터 보관 기간 안내", () => {
      render(<RestoreForm />);

      expect(screen.getByText("(데이터 보관 기간: 30일)")).toBeInTheDocument();
    });

    it("계정 복구 버튼", () => {
      render(<RestoreForm />);

      expect(screen.getByRole("button", { name: "계정 복구하기" })).toBeInTheDocument();
    });

    it("영구 삭제 버튼", () => {
      render(<RestoreForm />);

      expect(screen.getByRole("button", { name: "영구 삭제하기" })).toBeInTheDocument();
    });

    it("복구 버튼 클릭", () => {
      render(<RestoreForm />);

      fireEvent.click(screen.getByRole("button", { name: "계정 복구하기" }));

      expect(mockHandleRestore).toHaveBeenCalled();
    });

    it("삭제 버튼 클릭", () => {
      render(<RestoreForm />);

      fireEvent.click(screen.getByRole("button", { name: "영구 삭제하기" }));

      expect(mockOpenDeleteConfirm).toHaveBeenCalled();
    });
  });

  describe("로딩 상태", () => {
    beforeEach(() => {
      mockUseRestoreForm.mockReturnValue({
        hasToken: true,
        status: "loading",
        errorMessage: "",
        showDeleteConfirm: false,
        handleRestore: vi.fn(),
        handleDelete: vi.fn(),
        openDeleteConfirm: vi.fn(),
        closeDeleteConfirm: vi.fn(),
      });
    });

    it("처리 중 텍스트", () => {
      render(<RestoreForm />);

      expect(screen.getByRole("button", { name: "처리 중..." })).toBeInTheDocument();
    });

    it("버튼 비활성화", () => {
      render(<RestoreForm />);

      const restoreBtn = screen.getByRole("button", { name: "처리 중..." });
      expect(restoreBtn).toBeDisabled();
    });
  });

  describe("에러 상태", () => {
    beforeEach(() => {
      mockUseRestoreForm.mockReturnValue({
        hasToken: true,
        status: "error",
        errorMessage: "복구에 실패했습니다.",
        showDeleteConfirm: false,
        handleRestore: vi.fn(),
        handleDelete: vi.fn(),
        openDeleteConfirm: vi.fn(),
        closeDeleteConfirm: vi.fn(),
      });
    });

    it("에러 메시지 표시", () => {
      render(<RestoreForm />);

      expect(screen.getByText("복구에 실패했습니다.")).toBeInTheDocument();
    });
  });

  describe("삭제 확인 모달", () => {
    const mockHandleDelete = vi.fn();
    const mockCloseDeleteConfirm = vi.fn();

    beforeEach(() => {
      mockUseRestoreForm.mockReturnValue({
        hasToken: true,
        status: "idle",
        errorMessage: "",
        showDeleteConfirm: true,
        handleRestore: vi.fn(),
        handleDelete: mockHandleDelete,
        openDeleteConfirm: vi.fn(),
        closeDeleteConfirm: mockCloseDeleteConfirm,
      });
    });

    it("삭제 확인 메시지", () => {
      render(<RestoreForm />);

      expect(screen.getByText("정말로 계정을 영구 삭제하시겠습니까?")).toBeInTheDocument();
    });

    it("경고 메시지", () => {
      render(<RestoreForm />);

      expect(screen.getByText(/이 작업은 되돌릴 수 없으며/)).toBeInTheDocument();
    });

    it("취소 버튼", () => {
      render(<RestoreForm />);

      fireEvent.click(screen.getByRole("button", { name: "취소" }));

      expect(mockCloseDeleteConfirm).toHaveBeenCalled();
    });

    it("영구 삭제 버튼", () => {
      render(<RestoreForm />);

      fireEvent.click(screen.getByRole("button", { name: "영구 삭제" }));

      expect(mockHandleDelete).toHaveBeenCalled();
    });
  });
});
