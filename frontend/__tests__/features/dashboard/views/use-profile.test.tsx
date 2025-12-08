import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/features/auth/use-auth", () => ({
  useAuth: () => ({ user: { id: "1", name: "Test" }, loading: false, isAuthenticated: true, refetch: vi.fn() }),
}));
vi.mock("@/lib/api/services/auth.api", () => ({
  updateUserProfile: vi.fn(),
  deleteAccount: vi.fn(),
}));

import { useProfile } from "@/features/dashboard/views/use-profile";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useProfile", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useProfile(), { wrapper });
    expect(result.current.isEditing).toBe(false);
  });
});
