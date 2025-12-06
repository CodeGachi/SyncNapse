/**
 * SyncStatusBar 컴포넌트 테스트
 * 동기화 상태 표시바
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { SyncStatusBar } from "@/components/sync/sync-status-bar";

// useSyncStore mock
const mockUseSyncStore = vi.fn();
vi.mock("@/lib/sync/sync-store", () => ({
  useSyncStore: () => mockUseSyncStore(),
}));

describe("SyncStatusBar", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // 개발 환경으로 설정
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("프로덕션 환경", () => {
    it("프로덕션에서는 렌더링 안함", () => {
      vi.stubEnv("NODE_ENV", "production");

      mockUseSyncStore.mockReturnValue({
        queue: { items: [] },
        isSyncing: false,
        lastSyncTime: null,
        syncError: null,
      });

      const { container } = render(<SyncStatusBar />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("동기화 상태", () => {
    it("동기화 중", async () => {
      mockUseSyncStore.mockReturnValue({
        queue: { items: ["item1", "item2"] },
        isSyncing: true,
        lastSyncTime: null,
        syncError: null,
      });

      render(<SyncStatusBar />);

      await waitFor(() => {
        expect(screen.getByText("동기화 중...")).toBeInTheDocument();
        expect(screen.getByText("2개 항목 처리 중")).toBeInTheDocument();
      });
    });

    it("동기화 대기 중", async () => {
      mockUseSyncStore.mockReturnValue({
        queue: { items: ["item1", "item2", "item3"] },
        isSyncing: false,
        lastSyncTime: null,
        syncError: null,
      });

      render(<SyncStatusBar />);

      await waitFor(() => {
        expect(screen.getByText("동기화 대기 중")).toBeInTheDocument();
        expect(screen.getByText("3개 항목 대기")).toBeInTheDocument();
      });
    });

    it("동기화 에러", async () => {
      mockUseSyncStore.mockReturnValue({
        queue: { items: [] },
        isSyncing: false,
        lastSyncTime: null,
        syncError: "네트워크 오류",
      });

      render(<SyncStatusBar />);

      await waitFor(() => {
        expect(screen.getByText("동기화 실패")).toBeInTheDocument();
        expect(screen.getByText("네트워크 오류")).toBeInTheDocument();
      });
    });
  });

  describe("닫기 버튼", () => {
    it("닫기 버튼 존재", async () => {
      mockUseSyncStore.mockReturnValue({
        queue: { items: ["item1"] },
        isSyncing: true,
        lastSyncTime: null,
        syncError: null,
      });

      render(<SyncStatusBar />);

      await waitFor(() => {
        expect(screen.getByLabelText("닫기")).toBeInTheDocument();
      });
    });

    it("닫기 클릭 시 숨김", async () => {
      mockUseSyncStore.mockReturnValue({
        queue: { items: ["item1"] },
        isSyncing: true,
        lastSyncTime: null,
        syncError: null,
      });

      const { container } = render(<SyncStatusBar />);

      await waitFor(() => {
        expect(screen.getByText("동기화 중...")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByLabelText("닫기"));

      await waitFor(() => {
        expect(container.querySelector(".fixed")).toBeNull();
      });
    });
  });

  describe("자동 숨김", () => {
    it("완료 후 3초 뒤 자동 숨김", async () => {
      vi.useFakeTimers();

      // 초기: 동기화 중
      mockUseSyncStore.mockReturnValue({
        queue: { items: ["item1"] },
        isSyncing: true,
        lastSyncTime: null,
        syncError: null,
      });

      const { container, rerender } = render(<SyncStatusBar />);

      expect(screen.getByText("동기화 중...")).toBeInTheDocument();

      // 완료 상태로 변경
      mockUseSyncStore.mockReturnValue({
        queue: { items: [] },
        isSyncing: false,
        lastSyncTime: Date.now(),
        syncError: null,
      });

      rerender(<SyncStatusBar />);

      // 3초 경과
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // 상태바가 숨겨져야 함
      expect(container.querySelector(".fixed")).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("스타일", () => {
    it("동기화 중 파란색 스타일", async () => {
      mockUseSyncStore.mockReturnValue({
        queue: { items: ["item1"] },
        isSyncing: true,
        lastSyncTime: null,
        syncError: null,
      });

      const { container } = render(<SyncStatusBar />);

      await waitFor(() => {
        const bar = container.querySelector(".bg-blue-500\\/20");
        expect(bar).toBeInTheDocument();
      });
    });

    it("에러 빨간색 스타일", async () => {
      mockUseSyncStore.mockReturnValue({
        queue: { items: [] },
        isSyncing: false,
        lastSyncTime: null,
        syncError: "에러 발생",
      });

      const { container } = render(<SyncStatusBar />);

      await waitFor(() => {
        const bar = container.querySelector(".bg-red-500\\/20");
        expect(bar).toBeInTheDocument();
      });
    });
  });
});
