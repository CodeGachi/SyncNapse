/**
 * CreateFolderModal 컴포넌트 테스트
 * 폴더 생성 모달
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateFolderModal } from "@/components/dashboard/folder-management/create-folder-modal";

// useFolders mock
const mockCreateFolder = vi.fn();
vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({
    createFolder: mockCreateFolder,
    buildFolderTree: () => [],
    folders: [],
  }),
}));

// logger mock
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("CreateFolderModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    parentId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFolder.mockResolvedValue({});
  });

  describe("렌더링", () => {
    it("제목 표시", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("새 폴더 만들기")).toBeInTheDocument();
      });
    });

    it("폴더 이름 입력 필드", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("폴더 이름을 입력하세요")).toBeInTheDocument();
      });
    });

    it("위치 선택 버튼", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("위치")).toBeInTheDocument();
        expect(screen.getByText("Root")).toBeInTheDocument();
      });
    });

    it("취소 버튼", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
      });
    });

    it("만들기 버튼", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "만들기" })).toBeInTheDocument();
      });
    });
  });

  describe("폴더 이름 입력", () => {
    it("빈 이름일 때 만들기 버튼 비활성화", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "만들기" })).toBeDisabled();
      });
    });

    it("이름 입력 시 만들기 버튼 활성화", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("폴더 이름을 입력하세요")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("폴더 이름을 입력하세요"), {
        target: { value: "새 폴더" },
      });

      expect(screen.getByRole("button", { name: "만들기" })).not.toBeDisabled();
    });
  });

  describe("폴더 생성", () => {
    it("만들기 버튼 클릭 시 createFolder 호출", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("폴더 이름을 입력하세요")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("폴더 이름을 입력하세요"), {
        target: { value: "새 폴더" },
      });

      fireEvent.click(screen.getByRole("button", { name: "만들기" }));

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalledWith("새 폴더", null);
      });
    });

    it("Enter 키로 생성", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("폴더 이름을 입력하세요")).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText("폴더 이름을 입력하세요");
      fireEvent.change(input, { target: { value: "새 폴더" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(mockCreateFolder).toHaveBeenCalled();
      });
    });

    it("생성 후 모달 닫힘", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("폴더 이름을 입력하세요")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText("폴더 이름을 입력하세요"), {
        target: { value: "새 폴더" },
      });

      fireEvent.click(screen.getByRole("button", { name: "만들기" }));

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe("취소", () => {
    it("취소 버튼 클릭 시 onClose 호출", async () => {
      render(<CreateFolderModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "취소" }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("모달 닫힘", () => {
    it("isOpen=false일 때 렌더링 안함", () => {
      render(<CreateFolderModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("새 폴더 만들기")).not.toBeInTheDocument();
    });
  });
});
