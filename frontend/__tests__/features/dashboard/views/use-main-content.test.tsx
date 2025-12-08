import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/lib/api/queries/notes.queries", () => ({
  useNotes: () => ({ data: [], isLoading: false }),
}));
vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({ folders: [], isLoading: false, buildFolderTree: vi.fn() }),
}));
vi.mock("@/providers/dashboard-context", () => ({
  useDashboardContext: () => ({ selectedFolderId: null, setSelectedFolderId: vi.fn() }),
}));
vi.mock("@/lib/api/services/notes.api", () => ({
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));
vi.mock("@/lib/api/services/folders.api", () => ({
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveFolder: vi.fn(),
  fetchFolderPath: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/features/search/use-search", () => ({
  useSearch: () => ({
    query: "",
    setQuery: vi.fn(),
    isOpen: false,
    setIsOpen: vi.fn(),
    results: { notes: [], folders: [] },
    isLoading: false,
  }),
}));

import { useMainContent } from "@/features/dashboard/views/use-main-content";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useMainContent", () => {
  it("훅 호출 가능", () => {
    const { result } = renderHook(() => useMainContent(), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});
