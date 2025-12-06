/**
 * CursorOverlay 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock hooks
const mockCursors = vi.fn();

vi.mock("@/features/note/collaboration/use-cursor-presence", () => ({
  useOthersCursors: (options: any) => mockCursors(options),
}));

import { CursorOverlay } from "@/components/note/collaboration/cursor-overlay";

describe("CursorOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCursors.mockReturnValue([]);
  });

  describe("렌더링", () => {
    it("커서가 없으면 빈 오버레이", () => {
      mockCursors.mockReturnValue([]);

      const { container } = render(<CursorOverlay width={800} height={600} />);

      expect(container.querySelector("[data-testid^='cursor-']")).toBeNull();
    });

    it("커서 위치에 렌더링", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 200,
          name: "Test User",
          color: "#ff0000",
          isDrawingMode: false,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      const cursor = screen.getByTestId("cursor-1");
      expect(cursor).toBeInTheDocument();
      expect(cursor).toHaveStyle({ left: "100px", top: "200px" });
    });

    it("여러 커서 동시 렌더링", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 100,
          name: "User1",
          color: "#ff0000",
          isDrawingMode: false,
        },
        {
          connectionId: 2,
          x: 200,
          y: 200,
          name: "User2",
          color: "#00ff00",
          isDrawingMode: true,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      expect(screen.getByTestId("cursor-1")).toBeInTheDocument();
      expect(screen.getByTestId("cursor-2")).toBeInTheDocument();
    });
  });

  describe("커서 아이콘", () => {
    it("일반 모드: 포인터 아이콘", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 100,
          name: "User",
          color: "#ff0000",
          isDrawingMode: false,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      expect(screen.getByTestId("cursor-icon-pointer")).toBeInTheDocument();
      expect(screen.queryByTestId("cursor-icon-pen")).not.toBeInTheDocument();
    });

    it("드로잉 모드: 펜 아이콘", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 100,
          name: "User",
          color: "#ff0000",
          isDrawingMode: true,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      expect(screen.getByTestId("cursor-icon-pen")).toBeInTheDocument();
      expect(screen.queryByTestId("cursor-icon-pointer")).not.toBeInTheDocument();
    });

    it("여러 커서에서 각각 다른 아이콘", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 100,
          name: "User1",
          color: "#ff0000",
          isDrawingMode: false,
        },
        {
          connectionId: 2,
          x: 200,
          y: 200,
          name: "User2",
          color: "#00ff00",
          isDrawingMode: true,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      const pointerIcons = screen.getAllByTestId("cursor-icon-pointer");
      const penIcons = screen.getAllByTestId("cursor-icon-pen");

      expect(pointerIcons).toHaveLength(1);
      expect(penIcons).toHaveLength(1);
    });
  });

  describe("이름 라벨", () => {
    it("사용자 이름 표시", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 100,
          name: "Educator Kim",
          color: "#ff0000",
          isDrawingMode: false,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      expect(screen.getByText("Educator Kim")).toBeInTheDocument();
    });

    it("라벨 색상 = 커서 색상", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 100,
          name: "User",
          color: "#123456",
          isDrawingMode: false,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      const label = screen.getByText("User");
      expect(label).toHaveStyle({ backgroundColor: "#123456" });
    });
  });

  describe("스타일", () => {
    it("pointerEvents: none (드로잉 방해 안함)", () => {
      mockCursors.mockReturnValue([]);

      const { container } = render(<CursorOverlay width={800} height={600} />);

      const overlay = container.firstChild;
      expect(overlay).toHaveStyle({ pointerEvents: "none" });
    });

    it("올바른 크기 설정", () => {
      mockCursors.mockReturnValue([]);

      const { container } = render(<CursorOverlay width={1024} height={768} />);

      const overlay = container.firstChild;
      expect(overlay).toHaveStyle({ width: "1024px", height: "768px" });
    });

    it("position: absolute", () => {
      mockCursors.mockReturnValue([]);

      const { container } = render(<CursorOverlay width={800} height={600} />);

      const overlay = container.firstChild;
      expect(overlay).toHaveStyle({ position: "absolute" });
    });

    it("z-index: 20", () => {
      mockCursors.mockReturnValue([]);

      const { container } = render(<CursorOverlay width={800} height={600} />);

      const overlay = container.firstChild;
      expect(overlay).toHaveStyle({ zIndex: "20" });
    });
  });

  describe("educatorOnly prop", () => {
    it("educatorOnly=true 전달", () => {
      mockCursors.mockReturnValue([]);

      render(<CursorOverlay width={800} height={600} educatorOnly={true} />);

      expect(mockCursors).toHaveBeenCalledWith({ educatorOnly: true });
    });

    it("educatorOnly=false 전달 (기본값)", () => {
      mockCursors.mockReturnValue([]);

      render(<CursorOverlay width={800} height={600} />);

      expect(mockCursors).toHaveBeenCalledWith({ educatorOnly: false });
    });

    it("educatorOnly=false 명시적 전달", () => {
      mockCursors.mockReturnValue([]);

      render(<CursorOverlay width={800} height={600} educatorOnly={false} />);

      expect(mockCursors).toHaveBeenCalledWith({ educatorOnly: false });
    });
  });

  describe("커서 위치 업데이트", () => {
    it("커서 위치 변경 시 스타일 업데이트", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 100,
          y: 100,
          name: "User",
          color: "#ff0000",
          isDrawingMode: false,
        },
      ]);

      const { rerender } = render(<CursorOverlay width={800} height={600} />);

      let cursor = screen.getByTestId("cursor-1");
      expect(cursor).toHaveStyle({ left: "100px", top: "100px" });

      // 커서 위치 변경
      mockCursors.mockReturnValue([
        {
          connectionId: 1,
          x: 300,
          y: 400,
          name: "User",
          color: "#ff0000",
          isDrawingMode: false,
        },
      ]);

      rerender(<CursorOverlay width={800} height={600} />);

      cursor = screen.getByTestId("cursor-1");
      expect(cursor).toHaveStyle({ left: "300px", top: "400px" });
    });
  });

  describe("connectionId 기반 key", () => {
    it("connectionId로 고유 key 생성", () => {
      mockCursors.mockReturnValue([
        {
          connectionId: 123,
          x: 100,
          y: 100,
          name: "User1",
          color: "#ff0000",
          isDrawingMode: false,
        },
        {
          connectionId: 456,
          x: 200,
          y: 200,
          name: "User2",
          color: "#00ff00",
          isDrawingMode: true,
        },
      ]);

      render(<CursorOverlay width={800} height={600} />);

      // connectionId가 data-testid로 사용됨
      expect(screen.getByTestId("cursor-123")).toBeInTheDocument();
      expect(screen.getByTestId("cursor-456")).toBeInTheDocument();
    });
  });
});
