import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));

import { useLoginForm } from "@/features/auth/use-login-form";

describe("useLoginForm", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useLoginForm());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.loading).toBe(false);
  });
});
