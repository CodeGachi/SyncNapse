/**
 * use-main-content 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMainContent } from "@/features/dashboard/views/use-main-content";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/providers/dashboard-context", () => ({
  useDashboardContext: () => ({ selectedFolderId: "folder-1", setSelectedFolderId: vi.fn() }),
}));
vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({ folders: [{ id: "folder-1", name: "Work", parentId: null }], isLoading: false }),
}));
vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotesByFolder: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useMoveNote: () => ({ mutateAsync: vi.fn() }),
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => { vi.clearAllMocks(); queryClient.clear(); });

describe("useMainContent", () => {
  it("초기 상태 반환", () => {
    const { result } = renderHook(() => useMainContent(), { wrapper });
    expect(result.current.selectedFolderId).toBe("folder-1");
    expect(result.current.isLoading).toBe(false);
  });
});
