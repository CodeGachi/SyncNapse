/**
 * useRestoreForm 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRestoreForm } from "@/features/auth/use-restore-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("useRestoreForm", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useRestoreForm());
    expect(result.current.email).toBe("");
    expect(result.current.isLoading).toBe(false);
  });

  it("setEmail로 이메일 설정", () => {
    const { result } = renderHook(() => useRestoreForm());
    act(() => { result.current.setEmail("test@test.com"); });
    expect(result.current.email).toBe("test@test.com");
  });
});
