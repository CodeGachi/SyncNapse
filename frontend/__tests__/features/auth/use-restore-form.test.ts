import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/api/services/auth.api", () => ({
  restoreAccount: vi.fn(),
  permanentDeleteAccount: vi.fn(),
}));

import { useRestoreForm } from "@/features/auth/use-restore-form";

describe("useRestoreForm", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useRestoreForm());
    expect(result.current.hasToken).toBe(false);
    expect(result.current.status).toBe("idle");
  });
});
