/**
 * useSearchSync 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSearchSync } from "@/features/search/use-search-sync";

// Mock store
const mockCheckAndSync = vi.fn();
const mockStoreState = {
  checkAndSync: mockCheckAndSync,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
};

vi.mock("@/stores/search-sync-store", () => ({
  useSearchSyncStore: vi.fn(() => mockStoreState),
}));


describe("useSearchSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.isSyncing = false;
    mockStoreState.lastSyncedAt = null;
    mockStoreState.syncError = null;
  });

  describe("초기화", () => {
    it("마운트시 checkAndSync 호출", () => {
      renderHook(() => useSearchSync());

      expect(mockCheckAndSync).toHaveBeenCalled();
    });

    it("기본 반환값 확인", () => {
      const { result } = renderHook(() => useSearchSync());

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncedAt).toBeNull();
      expect(result.current.syncError).toBeNull();
    });
  });

  describe("동기화 상태", () => {
    it("isSyncing이 true일 때 반영", () => {
      mockStoreState.isSyncing = true;

      const { result } = renderHook(() => useSearchSync());

      expect(result.current.isSyncing).toBe(true);
    });

    it("lastSyncedAt 반영", () => {
      const syncTime = new Date();
      mockStoreState.lastSyncedAt = syncTime;

      const { result } = renderHook(() => useSearchSync());

      expect(result.current.lastSyncedAt).toBe(syncTime);
    });

    it("syncError 반영", () => {
      mockStoreState.syncError = "Sync failed";

      const { result } = renderHook(() => useSearchSync());

      expect(result.current.syncError).toBe("Sync failed");
    });
  });
});
