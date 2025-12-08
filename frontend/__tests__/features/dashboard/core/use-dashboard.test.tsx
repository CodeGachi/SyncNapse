import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotes: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useCreateNote: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useDashboard } from "@/features/dashboard/core/use-dashboard";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useDashboard", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.notes).toEqual([]);
  });
});
