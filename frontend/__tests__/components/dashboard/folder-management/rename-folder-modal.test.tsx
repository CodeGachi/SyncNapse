/**
 * RenameFolderModal 컴포넌트 테스트
 * 폴더 이름 변경 모달
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RenameFolderModal } from "@/components/dashboard/folder-management/rename-folder-modal";

describe("RenameFolderModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onRename: vi.fn(),
    currentName: "기존 폴더 이름",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("제목 표시", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("폴더 이름 변경")).toBeInTheDocument();
      });
    });

    it("현재 이름이 입력 필드에 표시", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        const input = screen.getByDisplayValue("기존 폴더 이름");
        expect(input).toBeInTheDocument();
      });
    });

    it("취소 버튼", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
      });
    });

    it("변경 버튼", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "변경" })).toBeInTheDocument();
      });
    });
  });

  describe("이름 변경", () => {
    it("새 이름 입력", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("기존 폴더 이름")).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue("기존 폴더 이름");
      fireEvent.change(input, { target: { value: "새 폴더 이름" } });

      expect(screen.getByDisplayValue("새 폴더 이름")).toBeInTheDocument();
    });

    it("빈 이름일 때 변경 버튼 비활성화", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("기존 폴더 이름")).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue("기존 폴더 이름");
      fireEvent.change(input, { target: { value: "" } });

      expect(screen.getByRole("button", { name: "변경" })).toBeDisabled();
    });

    it("변경 버튼 클릭 시 onRename 호출", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("기존 폴더 이름")).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue("기존 폴더 이름");
      fireEvent.change(input, { target: { value: "새 폴더 이름" } });

      fireEvent.click(screen.getByRole("button", { name: "변경" }));

      expect(defaultProps.onRename).toHaveBeenCalledWith("새 폴더 이름");
    });

    it("Enter 키로 변경", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("기존 폴더 이름")).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue("기존 폴더 이름");
      fireEvent.change(input, { target: { value: "새 폴더 이름" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(defaultProps.onRename).toHaveBeenCalledWith("새 폴더 이름");
    });
  });

  describe("취소", () => {
    it("취소 버튼 클릭 시 onClose 호출", async () => {
      render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "취소" }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("취소 시 원래 이름으로 복원", async () => {
      const { rerender } = render(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("기존 폴더 이름")).toBeInTheDocument();
      });

      // 이름 변경
      const input = screen.getByDisplayValue("기존 폴더 이름");
      fireEvent.change(input, { target: { value: "변경된 이름" } });

      // 취소
      fireEvent.click(screen.getByRole("button", { name: "취소" }));

      // 다시 열면 원래 이름
      rerender(<RenameFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("기존 폴더 이름")).toBeInTheDocument();
      });
    });
  });

  describe("모달 닫힘", () => {
    it("isOpen=false일 때 렌더링 안함", () => {
      render(<RenameFolderModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("폴더 이름 변경")).not.toBeInTheDocument();
    });
  });

  describe("모달 열릴 때 초기화", () => {
    it("모달 다시 열릴 때 currentName으로 초기화", async () => {
      const { rerender } = render(<RenameFolderModal {...defaultProps} isOpen={false} />);

      // 모달 열기
      rerender(<RenameFolderModal {...defaultProps} isOpen={true} currentName="새 현재 이름" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("새 현재 이름")).toBeInTheDocument();
      });
    });
  });
});
