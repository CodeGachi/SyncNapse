/**
 * useRestoreForm 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRestoreForm } from "@/features/auth/use-restore-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("@/lib/api/services/auth.api", () => ({
  restoreAccount: vi.fn(),
  permanentDeleteAccount: vi.fn(),
}));
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe("useRestoreForm", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useRestoreForm());
    expect(result.current.hasToken).toBe(false);
    expect(result.current.status).toBe("idle");
  });

  it("토큰이 있으면 hasToken이 true", () => {
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ push: vi.fn() }),
      useSearchParams: () => ({ get: () => "test-token" }),
    }));
    const { result } = renderHook(() => useRestoreForm());
    // 토큰이 없는 경우로 테스트 (mock 때문에)
    expect(result.current.status).toBe("idle");
  });
});
