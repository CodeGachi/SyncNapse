/**
 * DeleteConfirmModal 컴포넌트 테스트
 * 삭제 확인 모달
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";

describe("DeleteConfirmModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onDelete: vi.fn(),
    type: "note" as const,
    name: "테스트 노트",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("노트 삭제 제목", async () => {
      render(<DeleteConfirmModal {...defaultProps} type="note" />);

      await waitFor(() => {
        expect(screen.getByText("노트 삭제")).toBeInTheDocument();
      });
    });

    it("폴더 삭제 제목", async () => {
      render(<DeleteConfirmModal {...defaultProps} type="folder" />);

      await waitFor(() => {
        expect(screen.getByText("폴더 삭제")).toBeInTheDocument();
      });
    });

    it("삭제 대상 이름 표시", async () => {
      render(<DeleteConfirmModal {...defaultProps} name="내 중요 노트" />);

      await waitFor(() => {
        expect(screen.getByText('"내 중요 노트"')).toBeInTheDocument();
      });
    });

    it("되돌릴 수 없음 경고", async () => {
      render(<DeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("이 작업은 되돌릴 수 없습니다.")).toBeInTheDocument();
      });
    });
  });

  describe("폴더 삭제 경고", () => {
    it("폴더 삭제 시 내부 노트 경고", async () => {
      render(<DeleteConfirmModal {...defaultProps} type="folder" />);

      await waitFor(() => {
        expect(screen.getByText("* 폴더 내부의 노트도 모두 삭제됩니다.")).toBeInTheDocument();
      });
    });

    it("노트 삭제 시 경고 없음", async () => {
      render(<DeleteConfirmModal {...defaultProps} type="note" />);

      await waitFor(() => {
        expect(screen.queryByText(/폴더 내부/)).not.toBeInTheDocument();
      });
    });
  });

  describe("버튼", () => {
    it("취소 버튼", async () => {
      render(<DeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
      });
    });

    it("삭제 버튼", async () => {
      render(<DeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
      });
    });

    it("취소 클릭 시 onClose 호출", async () => {
      render(<DeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "취소" }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("삭제 클릭 시 onDelete 호출", async () => {
      render(<DeleteConfirmModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "삭제" }));

      expect(defaultProps.onDelete).toHaveBeenCalled();
    });
  });

  describe("모달 닫힘", () => {
    it("isOpen=false일 때 렌더링 안함", () => {
      render(<DeleteConfirmModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("노트 삭제")).not.toBeInTheDocument();
    });
  });
});
