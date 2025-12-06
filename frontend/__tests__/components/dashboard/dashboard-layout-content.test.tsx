/**
 * DashboardLayoutContent 컴포넌트 테스트
 * 대시보드 레이아웃 (사이드바 + 컨텐츠)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardLayoutContent } from "@/components/dashboard/dashboard-layout-content";

// useDashboardContext mock
const mockSetSelectedFolderId = vi.fn();
vi.mock("@/providers/dashboard-context", () => ({
  useDashboardContext: () => ({
    selectedFolderId: null,
    setSelectedFolderId: mockSetSelectedFolderId,
  }),
}));

// useSearchSync mock
vi.mock("@/features/search/use-search-sync", () => ({
  useSearchSync: vi.fn(),
}));

// Sidebar mock
vi.mock("@/components/dashboard/sidebar", () => ({
  Sidebar: ({ onCloseMobile, onSelectFolder }: { onCloseMobile?: () => void; onSelectFolder: (id: string | null) => void }) => (
    <aside data-testid="sidebar">
      <button data-testid="close-sidebar" onClick={onCloseMobile}>닫기</button>
      <button data-testid="select-folder" onClick={() => onSelectFolder("folder-1")}>폴더 선택</button>
    </aside>
  ),
}));

describe("DashboardLayoutContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("사이드바 렌더링", () => {
      render(
        <DashboardLayoutContent>
          <div>메인 컨텐츠</div>
        </DashboardLayoutContent>
      );

      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });

    it("children 렌더링", () => {
      render(
        <DashboardLayoutContent>
          <div>메인 컨텐츠</div>
        </DashboardLayoutContent>
      );

      expect(screen.getByText("메인 컨텐츠")).toBeInTheDocument();
    });

    it("햄버거 메뉴 버튼 (모바일)", () => {
      render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      expect(screen.getByLabelText("메뉴 열기")).toBeInTheDocument();
    });
  });

  describe("모바일 사이드바 토글", () => {
    it("햄버거 버튼 클릭 시 사이드바 열림", () => {
      const { container } = render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      fireEvent.click(screen.getByLabelText("메뉴 열기"));

      // 사이드바 컨테이너가 translate-x-0 클래스를 가져야 함
      const sidebarContainer = container.querySelector(".translate-x-0");
      expect(sidebarContainer).toBeInTheDocument();
    });

    it("사이드바 닫기 버튼 클릭", () => {
      render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      // 사이드바 열기
      fireEvent.click(screen.getByLabelText("메뉴 열기"));

      // 사이드바 닫기
      fireEvent.click(screen.getByTestId("close-sidebar"));

      // 오버레이가 없어야 함
      const overlay = document.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(overlay).not.toBeInTheDocument();
    });

    it("오버레이 클릭 시 사이드바 닫힘", () => {
      const { container } = render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      // 사이드바 열기
      fireEvent.click(screen.getByLabelText("메뉴 열기"));

      // 오버레이 클릭
      const overlay = container.querySelector(".fixed.inset-0.bg-black\\/50");
      if (overlay) {
        fireEvent.click(overlay);
      }

      // 오버레이가 없어야 함
      expect(container.querySelector(".fixed.inset-0.bg-black\\/50")).not.toBeInTheDocument();
    });
  });

  describe("폴더 선택", () => {
    it("폴더 선택 시 setSelectedFolderId 호출", () => {
      render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      fireEvent.click(screen.getByTestId("select-folder"));

      expect(mockSetSelectedFolderId).toHaveBeenCalledWith("folder-1");
    });

    it("폴더 선택 시 모바일 사이드바 닫힘", () => {
      const { container } = render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      // 사이드바 열기
      fireEvent.click(screen.getByLabelText("메뉴 열기"));

      // 폴더 선택
      fireEvent.click(screen.getByTestId("select-folder"));

      // 사이드바가 닫혀야 함 (translate 클래스 확인)
      const sidebarContainer = container.querySelector(".-translate-x-full");
      expect(sidebarContainer).toBeInTheDocument();
    });
  });

  describe("레이아웃", () => {
    it("전체 화면 높이", () => {
      const { container } = render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("h-screen");
    });

    it("flex 레이아웃", () => {
      const { container } = render(
        <DashboardLayoutContent>
          <div>컨텐츠</div>
        </DashboardLayoutContent>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex");
    });
  });
});
