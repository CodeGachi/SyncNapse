import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/features/dashboard", () => ({
  useFolders: () => ({
    folders: [{ id: "folder-1", name: "Test", parentId: null }],
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
  }),
}));
vi.mock("@/lib/api/mutations/notes.mutations", () => ({
  useDeleteNote: () => ({ mutateAsync: vi.fn() }),
}));

import { useDashboardSidebar } from "@/features/dashboard/sidebar/use-dashboard-sidebar";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useDashboardSidebar", () => {
  it("드롭다운 토글", () => {
    const { result } = renderHook(
      () => useDashboardSidebar({ selectedFolderId: null, onSelectFolder: vi.fn() }),
      { wrapper }
    );
    expect(result.current.isNoteDropdownOpen).toBe(false);
    act(() => result.current.toggleNoteDropdown());
    expect(result.current.isNoteDropdownOpen).toBe(true);
  });
});
