import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/stores/search-sync-store", () => ({
  useSearchSyncStore: () => ({
    checkAndSync: vi.fn(),
    isSyncing: false,
    lastSyncedAt: null,
    syncError: null,
  }),
}));

import { useSearchSync } from "@/features/search/use-search-sync";

describe("useSearchSync", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useSearchSync());
    expect(result.current.isSyncing).toBe(false);
  });
});
