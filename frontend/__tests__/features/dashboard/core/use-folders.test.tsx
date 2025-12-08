/**
 * useFolders 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFolders } from "@/features/dashboard/core/use-folders";
import * as foldersQueries from "@/lib/api/queries/folders.queries";
import * as foldersApi from "@/lib/api/services/folders.api";
import { ReactNode } from "react";

vi.mock("@/lib/api/queries/folders.queries", () => ({ useFoldersQuery: vi.fn() }));
vi.mock("@/lib/api/services/folders.api", () => ({
  createFolder: vi.fn(),
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveFolder: vi.fn(),
  fetchFolderPath: vi.fn(),
}));

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

const setupDefaultMocks = () => {
  vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
    data: mockFolders,
    isLoading: false,
    error: null,
  } as any);
};

beforeAll(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

beforeEach(() => {
  queryClient.clear();
  invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
  vi.clearAllMocks();
  setupDefaultMocks();
});

describe("useFolders", () => {
  it("로딩/데이터/에러 상태 반환", () => {
    // 로딩
    vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
      data: undefined, isLoading: true, error: null,
    } as any);
    const { result: loadingResult } = renderHook(() => useFolders(), { wrapper });
    expect(loadingResult.current.isLoading).toBe(true);
    expect(loadingResult.current.folders).toEqual([]);

    // 데이터
    setupDefaultMocks();
    const { result: dataResult } = renderHook(() => useFolders(), { wrapper });
    expect(dataResult.current.folders).toEqual(mockFolders);

    // 에러
    vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
      data: undefined, isLoading: false, error: new Error("Failed"),
    } as any);
    const { result: errorResult } = renderHook(() => useFolders(), { wrapper });
    expect(errorResult.current.error).toBe("Failed");
  });

  it("폴더 CRUD 작업", async () => {
    const { result } = renderHook(() => useFolders(), { wrapper });

    // 생성
    vi.mocked(foldersApi.createFolder).mockResolvedValue(undefined as any);
    await act(async () => await result.current.createFolder("New Folder", "root"));
    expect(foldersApi.createFolder).toHaveBeenCalledWith("New Folder", "root");
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });

    await act(async () => await result.current.createFolder("Root Level"));
    expect(foldersApi.createFolder).toHaveBeenLastCalledWith("Root Level", null);

    // 이름 변경
    vi.mocked(foldersApi.renameFolder).mockResolvedValue(undefined as any);
    await act(async () => await result.current.renameFolder("folder-1", "Renamed"));
    expect(foldersApi.renameFolder).toHaveBeenCalledWith("folder-1", "Renamed");

    // 삭제
    vi.mocked(foldersApi.deleteFolder).mockResolvedValue(undefined as any);
    await act(async () => await result.current.deleteFolder("folder-1"));
    expect(foldersApi.deleteFolder).toHaveBeenCalledWith("folder-1");

    // 이동
    vi.mocked(foldersApi.moveFolder).mockResolvedValue(undefined as any);
    await act(async () => await result.current.moveFolder("folder-1", "folder-2"));
    expect(foldersApi.moveFolder).toHaveBeenCalledWith("folder-1", "folder-2");
  });

  it("에러 처리", async () => {
    const { result } = renderHook(() => useFolders(), { wrapper });

    vi.mocked(foldersApi.createFolder).mockRejectedValue(new Error("Creation failed"));
    await expect(result.current.createFolder("Fail")).rejects.toThrow("Creation failed");

    vi.mocked(foldersApi.createFolder).mockRejectedValue("Unknown");
    await expect(result.current.createFolder("Fail")).rejects.toThrow("폴더 생성에 실패했습니다.");
  });

  it("하위 폴더 및 트리 구조 조회", () => {
    const { result } = renderHook(() => useFolders(), { wrapper });

    // getSubFolders
    expect(result.current.getSubFolders("root")).toHaveLength(2);
    expect(result.current.getSubFolders("folder-2")).toEqual([]);
    expect(result.current.getSubFolders(null)).toHaveLength(1);

    // buildFolderTree
    const tree = result.current.buildFolderTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].folder.name).toBe("Root");
    expect(tree[0].children).toHaveLength(2);

    const folder1 = tree[0].children.find((c) => c.folder.name === "Folder 1");
    expect(folder1?.children[0].folder.name).toBe("Subfolder 1");

    // Root 없으면 빈 배열
    vi.mocked(foldersQueries.useFoldersQuery).mockReturnValue({
      data: [{ id: "orphan", name: "Orphan", parentId: "nonexistent" }],
      isLoading: false, error: null,
    } as any);
    const { result: emptyResult } = renderHook(() => useFolders(), { wrapper });
    expect(emptyResult.current.buildFolderTree()).toEqual([]);
  });

  it("경로 조회 및 새로고침", async () => {
    const mockPath = [
      { id: "root", name: "Root", parentId: null },
      { id: "folder-1", name: "Folder 1", parentId: "root" },
    ];
    vi.mocked(foldersApi.fetchFolderPath).mockResolvedValue(mockPath);

    const { result } = renderHook(() => useFolders(), { wrapper });
    const path = await result.current.getFolderPath("folder-1");
    expect(path).toEqual(mockPath);

    await act(async () => await result.current.reload());
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
  });
});
