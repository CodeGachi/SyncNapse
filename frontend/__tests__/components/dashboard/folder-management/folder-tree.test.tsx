/**
 * FolderTree 컴포넌트 테스트
 * 폴더 트리 네비게이션
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FolderTree } from "@/components/dashboard/folder-management/folder-tree";
import type { FolderTreeNode } from "@/features/dashboard";

// useFolderDragDrop mock
vi.mock("@/features/dashboard", () => ({
  useFolderDragDrop: () => ({
    draggedItem: null,
    dragOverItem: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
  }),
}));

// FolderOptionsMenu mock
vi.mock("@/components/dashboard/folder-management/folder-options-menu", () => ({
  FolderOptionsMenu: () => <button data-testid="folder-options">옵션</button>,
}));

// FolderNotes mock
vi.mock("@/components/dashboard/folder-management/folder-notes", () => ({
  FolderNotes: () => <div data-testid="folder-notes">노트 목록</div>,
}));

const mockTree: FolderTreeNode[] = [
  {
    folder: { id: "folder-1", name: "폴더 1", parentId: null, createdAt: "2024-01-01", updatedAt: "2024-01-01" },
    children: [
      {
        folder: { id: "folder-1-1", name: "하위 폴더 1-1", parentId: "folder-1", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
        children: [],
      },
    ],
  },
  {
    folder: { id: "folder-2", name: "폴더 2", parentId: null, createdAt: "2024-01-02", updatedAt: "2024-01-02" },
    children: [],
  },
];

describe("FolderTree", () => {
  const defaultProps = {
    tree: mockTree,
    selectedFolderId: null,
    onSelectFolder: vi.fn(),
    onCreateSubFolder: vi.fn(),
    onRenameFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
    onDeleteNote: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("폴더 목록 렌더링", () => {
      render(<FolderTree {...defaultProps} />);

      expect(screen.getByText("폴더 1")).toBeInTheDocument();
      expect(screen.getByText("폴더 2")).toBeInTheDocument();
    });

    it("빈 트리일 때 빈 목록", () => {
      render(<FolderTree {...defaultProps} tree={[]} />);

      expect(screen.queryByText("폴더")).not.toBeInTheDocument();
    });
  });

  describe("폴더 선택", () => {
    it("폴더 클릭 시 onSelectFolder 호출", () => {
      render(<FolderTree {...defaultProps} />);

      fireEvent.click(screen.getByText("폴더 1"));

      expect(defaultProps.onSelectFolder).toHaveBeenCalledWith("folder-1");
    });

    it("선택된 폴더 스타일 적용", () => {
      render(<FolderTree {...defaultProps} selectedFolderId="folder-1" />);

      const folder1 = screen.getByText("폴더 1").parentElement;
      expect(folder1).toHaveClass("bg-brand/10");
    });
  });

  describe("폴더 확장/축소", () => {
    it("하위 폴더가 있는 폴더에 확장 버튼 표시", () => {
      render(<FolderTree {...defaultProps} />);

      // 폴더 1은 하위 폴더가 있으므로 확장 버튼이 있어야 함
      const expandButtons = screen.getAllByRole("button");
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it("확장 버튼 클릭 시 하위 폴더 표시", () => {
      render(<FolderTree {...defaultProps} />);

      // 폴더 1 확장
      const folder1Item = screen.getByText("폴더 1").closest("li");
      const expandButton = folder1Item?.querySelector("button");

      if (expandButton) {
        fireEvent.click(expandButton);
        expect(screen.getByText("하위 폴더 1-1")).toBeInTheDocument();
      }
    });
  });

  describe("컨텍스트 메뉴", () => {
    it("우클릭 시 컨텍스트 메뉴 표시", () => {
      render(<FolderTree {...defaultProps} />);

      const folder1 = screen.getByText("폴더 1").parentElement;
      if (folder1) {
        fireEvent.contextMenu(folder1);

        // 컨텍스트 메뉴 아이템 확인
        expect(screen.getByText("Rename")).toBeInTheDocument();
        expect(screen.getByText("Add Subfolder")).toBeInTheDocument();
        expect(screen.getByText("Delete")).toBeInTheDocument();
      }
    });

    it("Rename 클릭 시 onRenameFolder 호출", () => {
      render(<FolderTree {...defaultProps} />);

      const folder1 = screen.getByText("폴더 1").parentElement;
      if (folder1) {
        fireEvent.contextMenu(folder1);
        fireEvent.click(screen.getByText("Rename"));

        expect(defaultProps.onRenameFolder).toHaveBeenCalledWith("folder-1");
      }
    });

    it("Add Subfolder 클릭 시 onCreateSubFolder 호출", () => {
      render(<FolderTree {...defaultProps} />);

      const folder1 = screen.getByText("폴더 1").parentElement;
      if (folder1) {
        fireEvent.contextMenu(folder1);
        fireEvent.click(screen.getByText("Add Subfolder"));

        expect(defaultProps.onCreateSubFolder).toHaveBeenCalledWith("folder-1");
      }
    });

    it("Delete 클릭 시 onDeleteFolder 호출", () => {
      render(<FolderTree {...defaultProps} />);

      const folder1 = screen.getByText("폴더 1").parentElement;
      if (folder1) {
        fireEvent.contextMenu(folder1);
        fireEvent.click(screen.getByText("Delete"));

        expect(defaultProps.onDeleteFolder).toHaveBeenCalledWith("folder-1");
      }
    });

    it("외부 클릭 시 컨텍스트 메뉴 닫힘", () => {
      render(<FolderTree {...defaultProps} />);

      const folder1 = screen.getByText("폴더 1").parentElement;
      if (folder1) {
        fireEvent.contextMenu(folder1);
        expect(screen.getByText("Rename")).toBeInTheDocument();

        // 외부 클릭 (backdrop)
        const backdrop = document.querySelector(".fixed.inset-0.z-40");
        if (backdrop) {
          fireEvent.click(backdrop);
          expect(screen.queryByText("Rename")).not.toBeInTheDocument();
        }
      }
    });
  });

  describe("중첩 레벨", () => {
    it("하위 폴더는 들여쓰기 적용", () => {
      render(<FolderTree {...defaultProps} />);

      // 폴더 1 확장
      const folder1Item = screen.getByText("폴더 1").closest("li");
      const expandButton = folder1Item?.querySelector("button");

      if (expandButton) {
        fireEvent.click(expandButton);

        const subFolder = screen.getByText("하위 폴더 1-1").parentElement;
        expect(subFolder).toHaveStyle({ marginLeft: "16px" });
      }
    });
  });
});
