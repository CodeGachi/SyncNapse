import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/lib/api/services/notes.api", () => ({
  fetchTrashedNotes: vi.fn().mockResolvedValue([]),
  restoreNote: vi.fn(),
  permanentlyDeleteNote: vi.fn(),
}));

import { useTrash } from "@/features/dashboard/views/use-trash";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useTrash", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useTrash(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
