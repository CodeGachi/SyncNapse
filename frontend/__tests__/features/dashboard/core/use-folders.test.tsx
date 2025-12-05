/**
 * useFolders 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFolders } from "@/features/dashboard/core/use-folders";
import * as foldersQueries from "@/lib/api/queries/folders.queries";
import * as foldersApi from "@/lib/api/services/folders.api";
import { ReactNode } from "react";

// Mock folders queries
vi.mock("@/lib/api/queries/folders.queries", () => ({
  useFoldersQuery: vi.fn(),
}));

// Mock folders API
vi.mock("@/lib/api/services/folders.api", () => ({
  createFolder: vi.fn(),
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveFolder: vi.fn(),
  fetchFolderPath: vi.fn(),
}));

describe("useFolders", () => {
  let queryClient: QueryClient;
  let invalidateQueriesSpy: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockFolders = [
    { id: "root", name: "Root", parentId: null },
    { id: "folder-1", name: "Folder 1", parentId: "root" },
    { id: "folder-2", name: "Folder 2", parentId: "root" },
    { id: "subfolder-1", name: "Subfolder 1", parentId: "folder-1" },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    vi.clearAllMocks();
  });

  describe("폴더 목록 조회", () => {
    it("로딩 중일 때 isLoading이 true", () => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.folders).toEqual([]);
    });

    it("폴더 목록 반환", () => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.folders).toEqual(mockFolders);
    });

    it("에러 메시지 반환", () => {
      const mockError = new Error("Failed to fetch folders");

      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
      } as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      expect(result.current.error).toBe("Failed to fetch folders");
    });
  });

  describe("createFolder", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("폴더 생성 성공시 캐시 무효화", async () => {
      vi.mocked(foldersApi.createFolder).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      await act(async () => {
        await result.current.createFolder("New Folder", "root");
      });

      expect(foldersApi.createFolder).toHaveBeenCalledWith("New Folder", "root");
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("parentId 없이 생성", async () => {
      vi.mocked(foldersApi.createFolder).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      await act(async () => {
        await result.current.createFolder("Root Level Folder");
      });

      expect(foldersApi.createFolder).toHaveBeenCalledWith("Root Level Folder", null);
    });

    it("폴더 생성 실패시 에러 throw", async () => {
      vi.mocked(foldersApi.createFolder).mockRejectedValue(
        new Error("Creation failed")
      );

      const { result } = renderHook(() => useFolders(), { wrapper });

      await expect(
        result.current.createFolder("Failing Folder")
      ).rejects.toThrow("Creation failed");
    });

    it("알 수 없는 에러시 기본 메시지", async () => {
      vi.mocked(foldersApi.createFolder).mockRejectedValue("Unknown error");

      const { result } = renderHook(() => useFolders(), { wrapper });

      await expect(
        result.current.createFolder("Failing Folder")
      ).rejects.toThrow("폴더 생성에 실패했습니다.");
    });
  });

  describe("renameFolder", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("폴더 이름 변경 성공시 캐시 무효화", async () => {
      vi.mocked(foldersApi.renameFolder).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      await act(async () => {
        await result.current.renameFolder("folder-1", "Renamed Folder");
      });

      expect(foldersApi.renameFolder).toHaveBeenCalledWith(
        "folder-1",
        "Renamed Folder"
      );
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("폴더 이름 변경 실패시 에러 throw", async () => {
      vi.mocked(foldersApi.renameFolder).mockRejectedValue(
        new Error("Rename failed")
      );

      const { result } = renderHook(() => useFolders(), { wrapper });

      await expect(
        result.current.renameFolder("folder-1", "New Name")
      ).rejects.toThrow("Rename failed");
    });
  });

  describe("deleteFolder", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("폴더 삭제 성공시 캐시 무효화", async () => {
      vi.mocked(foldersApi.deleteFolder).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      await act(async () => {
        await result.current.deleteFolder("folder-1");
      });

      expect(foldersApi.deleteFolder).toHaveBeenCalledWith("folder-1");
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("폴더 삭제 실패시 에러 throw", async () => {
      vi.mocked(foldersApi.deleteFolder).mockRejectedValue(
        new Error("Delete failed")
      );

      const { result } = renderHook(() => useFolders(), { wrapper });

      await expect(result.current.deleteFolder("folder-1")).rejects.toThrow(
        "Delete failed"
      );
    });
  });

  describe("moveFolder", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("폴더 이동 성공시 캐시 무효화", async () => {
      vi.mocked(foldersApi.moveFolder).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      await act(async () => {
        await result.current.moveFolder("folder-1", "folder-2");
      });

      expect(foldersApi.moveFolder).toHaveBeenCalledWith("folder-1", "folder-2");
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });

    it("null parentId로 이동 (루트로)", async () => {
      vi.mocked(foldersApi.moveFolder).mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      await act(async () => {
        await result.current.moveFolder("subfolder-1", null);
      });

      expect(foldersApi.moveFolder).toHaveBeenCalledWith("subfolder-1", null);
    });

    it("폴더 이동 실패시 에러 throw", async () => {
      vi.mocked(foldersApi.moveFolder).mockRejectedValue(
        new Error("Move failed")
      );

      const { result } = renderHook(() => useFolders(), { wrapper });

      await expect(
        result.current.moveFolder("folder-1", "folder-2")
      ).rejects.toThrow("Move failed");
    });
  });

  describe("getSubFolders", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("특정 폴더의 하위 폴더 반환", () => {
      const { result } = renderHook(() => useFolders(), { wrapper });

      const subFolders = result.current.getSubFolders("root");

      expect(subFolders).toHaveLength(2);
      expect(subFolders.map((f) => f.name)).toEqual(["Folder 1", "Folder 2"]);
    });

    it("하위 폴더가 없으면 빈 배열 반환", () => {
      const { result } = renderHook(() => useFolders(), { wrapper });

      const subFolders = result.current.getSubFolders("folder-2");

      expect(subFolders).toEqual([]);
    });

    it("null parentId로 최상위 폴더 조회", () => {
      const { result } = renderHook(() => useFolders(), { wrapper });

      const rootFolders = result.current.getSubFolders(null);

      expect(rootFolders).toHaveLength(1);
      expect(rootFolders[0].name).toBe("Root");
    });
  });

  describe("buildFolderTree", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("Root부터 시작하는 트리 구조 생성", () => {
      const { result } = renderHook(() => useFolders(), { wrapper });

      const tree = result.current.buildFolderTree();

      expect(tree).toHaveLength(1);
      expect(tree[0].folder.name).toBe("Root");
      expect(tree[0].children).toHaveLength(2);
    });

    it("중첩된 폴더 구조 포함", () => {
      const { result } = renderHook(() => useFolders(), { wrapper });

      const tree = result.current.buildFolderTree();

      // Root > Folder 1 > Subfolder 1
      const folder1 = tree[0].children.find((c) => c.folder.name === "Folder 1");
      expect(folder1?.children).toHaveLength(1);
      expect(folder1?.children[0].folder.name).toBe("Subfolder 1");
    });

    it("Root 폴더가 없으면 빈 배열 반환", () => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: [
          { id: "orphan", name: "Orphan", parentId: "nonexistent" },
        ],
        isLoading: false,
        error: null,
      } as any);

      const { result } = renderHook(() => useFolders(), { wrapper });

      const tree = result.current.buildFolderTree();

      expect(tree).toEqual([]);
    });
  });

  describe("getFolderPath", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("폴더 경로 조회", async () => {
      const mockPath = [
        { id: "root", name: "Root", parentId: null },
        { id: "folder-1", name: "Folder 1", parentId: "root" },
      ];

      vi.mocked(foldersApi.fetchFolderPath).mockResolvedValue(mockPath);

      const { result } = renderHook(() => useFolders(), { wrapper });

      const path = await result.current.getFolderPath("folder-1");

      expect(foldersApi.fetchFolderPath).toHaveBeenCalledWith("folder-1");
      expect(path).toEqual(mockPath);
    });
  });

  describe("reload", () => {
    beforeEach(() => {
      vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
        data: mockFolders,
        isLoading: false,
        error: null,
      } as any);
    });

    it("수동 새로고침시 캐시 무효화", async () => {
      const { result } = renderHook(() => useFolders(), { wrapper });

      await act(async () => {
        await result.current.reload();
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    });
  });
});
