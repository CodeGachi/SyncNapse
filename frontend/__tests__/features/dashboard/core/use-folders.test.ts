/**
 * use-folders 테스트
 * 폴더 관리 훅
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFolders } from "@/features/dashboard/core/use-folders";

// Mock dependencies
const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock("@/lib/api/services/folders.api", () => ({
  createFolder: vi.fn(),
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveFolder: vi.fn(),
  fetchFolderPath: vi.fn(),
}));

vi.mock("@/lib/api/queries/folders.queries", () => ({
  useFoldersQuery: vi.fn(),
}));

import {
  createFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
  fetchFolderPath,
} from "@/lib/api/services/folders.api";
import { useFoldersQuery } from "@/lib/api/queries/folders.queries";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockFolders = [
  { id: "root", name: "Root", parentId: null, createdAt: 1000, updatedAt: 1000 },
  { id: "folder-1", name: "Work", parentId: "root", createdAt: 2000, updatedAt: 2000 },
  { id: "folder-2", name: "Personal", parentId: "root", createdAt: 3000, updatedAt: 3000 },
  { id: "folder-3", name: "Projects", parentId: "folder-1", createdAt: 4000, updatedAt: 4000 },
];

describe("useFolders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useFoldersQuery as any).mockReturnValue({
      data: mockFolders,
      isLoading: false,
      error: null,
    });
  });

  describe("폴더 목록 조회", () => {
    it("폴더 목록 반환", () => {
      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      expect(result.current.folders).toEqual(mockFolders);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("로딩 상태", () => {
      (useFoldersQuery as any).mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it("에러 상태", () => {
      const mockError = new Error("Failed to load");
      (useFoldersQuery as any).mockReturnValue({
        data: [],
        isLoading: false,
        error: mockError,
      });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBe("Failed to load");
    });
  });

  describe("폴더 생성", () => {
    it("폴더 생성 후 캐시 무효화", async () => {
      (createFolder as any).mockResolvedValue({ id: "new-folder" });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createFolder("New Folder", "root");
      });

      expect(createFolder).toHaveBeenCalledWith("New Folder", "root");
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("parentId 기본값 null", async () => {
      (createFolder as any).mockResolvedValue({ id: "new-folder" });

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.createFolder("Root Level Folder");
      });

      expect(createFolder).toHaveBeenCalledWith("Root Level Folder", null);
    });

    it("생성 실패 시 에러 throw", async () => {
      (createFolder as any).mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.createFolder("Fail Folder")
      ).rejects.toThrow("Create failed");
    });
  });

  describe("폴더 이름 변경", () => {
    it("이름 변경 후 캐시 무효화", async () => {
      (renameFolder as any).mockResolvedValue({});

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.renameFolder("folder-1", "New Name");
      });

      expect(renameFolder).toHaveBeenCalledWith("folder-1", "New Name");
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("이름 변경 실패 시 에러 throw", async () => {
      (renameFolder as any).mockRejectedValue(new Error("Rename failed"));

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.renameFolder("folder-1", "New Name")
      ).rejects.toThrow("Rename failed");
    });
  });

  describe("폴더 삭제", () => {
    it("삭제 후 캐시 무효화", async () => {
      (deleteFolder as any).mockResolvedValue({});

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.deleteFolder("folder-1");
      });

      expect(deleteFolder).toHaveBeenCalledWith("folder-1");
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("삭제 실패 시 에러 throw", async () => {
      (deleteFolder as any).mockRejectedValue(new Error("Delete failed"));

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.deleteFolder("folder-1")
      ).rejects.toThrow("Delete failed");
    });
  });

  describe("폴더 이동", () => {
    it("이동 후 캐시 무효화", async () => {
      (moveFolder as any).mockResolvedValue({});

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.moveFolder("folder-3", "folder-2");
      });

      expect(moveFolder).toHaveBeenCalledWith("folder-3", "folder-2");
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("이동 실패 시 에러 throw", async () => {
      (moveFolder as any).mockRejectedValue(new Error("Move failed"));

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.moveFolder("folder-1", "folder-2")
      ).rejects.toThrow("Move failed");
    });
  });

  describe("하위 폴더 조회", () => {
    it("특정 부모의 하위 폴더 반환", () => {
      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      const subFolders = result.current.getSubFolders("root");

      expect(subFolders).toHaveLength(2);
      expect(subFolders.map((f) => f.name)).toContain("Work");
      expect(subFolders.map((f) => f.name)).toContain("Personal");
    });

    it("하위 폴더 없으면 빈 배열", () => {
      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      const subFolders = result.current.getSubFolders("folder-2");

      expect(subFolders).toHaveLength(0);
    });
  });

  describe("폴더 트리 구조", () => {
    it("Root부터 시작하는 트리 구조 생성", () => {
      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      const tree = result.current.buildFolderTree(null);

      expect(tree).toHaveLength(1);
      expect(tree[0].folder.name).toBe("Root");
      expect(tree[0].children).toHaveLength(2); // Work, Personal
    });

    it("중첩된 폴더 트리", () => {
      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      const tree = result.current.buildFolderTree(null);
      const workFolder = tree[0].children.find((c) => c.folder.name === "Work");

      expect(workFolder?.children).toHaveLength(1);
      expect(workFolder?.children[0].folder.name).toBe("Projects");
    });
  });

  describe("폴더 경로 조회", () => {
    it("폴더 경로 반환", async () => {
      const mockPath = [
        { id: "root", name: "Root" },
        { id: "folder-1", name: "Work" },
      ];
      (fetchFolderPath as any).mockResolvedValue(mockPath);

      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      const path = await result.current.getFolderPath("folder-1");

      expect(path).toEqual(mockPath);
      expect(fetchFolderPath).toHaveBeenCalledWith("folder-1");
    });
  });

  describe("수동 새로고침", () => {
    it("reload 호출 시 캐시 무효화", async () => {
      const { result } = renderHook(() => useFolders(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.reload();
      });

      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });
  });
});
