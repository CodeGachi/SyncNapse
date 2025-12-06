/**
 * Breadcrumb 컴포넌트 테스트
 * 폴더 경로 표시 및 네비게이션
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import type { Folder } from "@/lib/types";

describe("Breadcrumb", () => {
  const mockOnFolderClick = vi.fn();

  const mockPath: Folder[] = [
    {
      id: "root",
      name: "Root",
      parentId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "folder-1",
      name: "강의자료",
      parentId: "root",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "folder-2",
      name: "2024학기",
      parentId: "folder-1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("폴더 경로 표시", () => {
      render(
        <Breadcrumb
          path={mockPath}
          onFolderClick={mockOnFolderClick}
        />
      );

      expect(screen.getByText("홈")).toBeInTheDocument();
      expect(screen.getByText("강의자료")).toBeInTheDocument();
      expect(screen.getByText("2024학기")).toBeInTheDocument();
    });

    it("Root 폴더는 '홈'으로 표시", () => {
      render(
        <Breadcrumb
          path={mockPath}
          onFolderClick={mockOnFolderClick}
        />
      );

      expect(screen.getByText("홈")).toBeInTheDocument();
      expect(screen.queryByText("Root")).not.toBeInTheDocument();
    });

    it("빈 경로일 때 아무것도 렌더링하지 않음", () => {
      const { container } = render(
        <Breadcrumb
          path={[]}
          onFolderClick={mockOnFolderClick}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("로딩 상태 표시", () => {
      render(
        <Breadcrumb
          path={[]}
          onFolderClick={mockOnFolderClick}
          isLoading={true}
        />
      );

      // 스켈레톤 UI가 표시됨 (animate-pulse 클래스)
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("클릭 핸들러", () => {
    it("폴더 클릭 시 onFolderClick 호출", () => {
      render(
        <Breadcrumb
          path={mockPath}
          onFolderClick={mockOnFolderClick}
        />
      );

      fireEvent.click(screen.getByText("강의자료"));

      expect(mockOnFolderClick).toHaveBeenCalledWith("folder-1");
    });

    it("Root(홈) 클릭 시 root id로 호출", () => {
      render(
        <Breadcrumb
          path={mockPath}
          onFolderClick={mockOnFolderClick}
        />
      );

      fireEvent.click(screen.getByText("홈"));

      expect(mockOnFolderClick).toHaveBeenCalledWith("root");
    });

    it("마지막 폴더도 클릭 가능", () => {
      render(
        <Breadcrumb
          path={mockPath}
          onFolderClick={mockOnFolderClick}
        />
      );

      fireEvent.click(screen.getByText("2024학기"));

      expect(mockOnFolderClick).toHaveBeenCalledWith("folder-2");
    });
  });

  describe("구분자", () => {
    it("폴더 사이에 구분자 표시 (첫 번째 제외)", () => {
      render(
        <Breadcrumb
          path={mockPath}
          onFolderClick={mockOnFolderClick}
        />
      );

      // SVG chevron 아이콘이 구분자로 사용됨
      // 3개의 폴더 = 2개의 구분자
      const separators = document.querySelectorAll('svg[viewBox="0 0 24 24"]');
      // 홈 아이콘 + 폴더 아이콘 2개 + 구분자 2개 = 5개
      expect(separators.length).toBe(5);
    });
  });

  describe("스타일링", () => {
    it("마지막 폴더는 강조 스타일 적용", () => {
      render(
        <Breadcrumb
          path={mockPath}
          onFolderClick={mockOnFolderClick}
        />
      );

      const lastFolder = screen.getByText("2024학기").closest("button");
      expect(lastFolder).toHaveClass("font-medium");
    });
  });
});
