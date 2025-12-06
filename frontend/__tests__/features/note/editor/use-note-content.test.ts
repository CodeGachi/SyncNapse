/**
 * use-note-content 훅 테스트
 * IndexedDB와 백엔드 간 노트 콘텐츠 저장/로드 및 자동 저장 관리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNoteContent } from "@/features/note/editor/use-note-content";

// Mock stores
const mockGetState = vi.fn();
const mockSetState = vi.fn();
const mockSelectedFileId = vi.fn(() => "file-1");

vi.mock("@/stores/note-editor-store", () => ({
  useNoteEditorStore: Object.assign(
    (selector: (state: any) => any) => {
      const state = { selectedFileId: mockSelectedFileId() };
      return selector ? selector(state) : state;
    },
    {
      getState: mockGetState,
      setState: mockSetState,
    }
  ),
}));

// Mock API
const mockSaveNoteContentAPI = vi.fn();
const mockGetNoteContentAPI = vi.fn();

vi.mock("@/lib/api/services/page-content.api", () => ({
  saveNoteContent: (...args: unknown[]) => mockSaveNoteContentAPI(...args),
  getNoteContent: (id: string) => mockGetNoteContentAPI(id),
}));

// Mock IndexedDB
const mockSaveToIndexedDB = vi.fn();
const mockGetAllNoteContent = vi.fn();
const mockCleanDuplicateNoteContent = vi.fn();

vi.mock("@/lib/db/notes", () => ({
  saveNoteContent: (...args: unknown[]) => mockSaveToIndexedDB(...args),
  getAllNoteContent: (id: string) => mockGetAllNoteContent(id),
  cleanDuplicateNoteContent: (id: string) => mockCleanDuplicateNoteContent(id),
}));

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("useNoteContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockGetState.mockReturnValue({
      pageNotes: {
        "file-1-1": [{ id: "block-1", content: "test" }],
        "file-1-2": [{ id: "block-2", content: "test2" }],
      },
      selectedFileId: "file-1",
    });
    mockSelectedFileId.mockReturnValue("file-1");
    mockGetAllNoteContent.mockResolvedValue([]);
    mockGetNoteContentAPI.mockResolvedValue(null);
    mockSaveNoteContentAPI.mockResolvedValue(undefined);
    mockSaveToIndexedDB.mockResolvedValue(undefined);
    mockCleanDuplicateNoteContent.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("초기 상태", () => {
    it("기본 상태값 반환", () => {
      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      expect(result.current.isLoading).toBe(true); // 로딩 시작
      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSavedAt).toBeNull();
      expect(typeof result.current.scheduleAutoSave).toBe("function");
      expect(typeof result.current.forceSave).toBe("function");
    });

    it("noteId가 없으면 로드하지 않음", () => {
      renderHook(() => useNoteContent({ noteId: null, enabled: true }));

      expect(mockGetAllNoteContent).not.toHaveBeenCalled();
      expect(mockGetNoteContentAPI).not.toHaveBeenCalled();
    });

    it("enabled가 false면 로드하지 않음", () => {
      renderHook(() => useNoteContent({ noteId: "note-1", enabled: false }));

      expect(mockGetAllNoteContent).not.toHaveBeenCalled();
      expect(mockGetNoteContentAPI).not.toHaveBeenCalled();
    });
  });

  describe("콘텐츠 로드", () => {
    it("IndexedDB에서 우선 로드", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [{ id: "block-1", content: "cached" }] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAllNoteContent).toHaveBeenCalledWith("note-1");
      expect(mockSetState).toHaveBeenCalled();
    });

    it("IndexedDB 없으면 백엔드에서 로드", async () => {
      mockGetAllNoteContent
        .mockResolvedValueOnce([]) // 첫 호출: 빈 배열
        .mockResolvedValueOnce([
          // 두 번째 호출: 백엔드 저장 후
          { pageId: "1", blocks: [{ id: "block-1", content: "from-backend" }] },
        ]);

      mockGetNoteContentAPI.mockResolvedValue({
        pages: {
          "1": { blocks: [{ id: "block-1", content: "from-backend" }] },
        },
      });

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetNoteContentAPI).toHaveBeenCalledWith("note-1");
      expect(mockSaveToIndexedDB).toHaveBeenCalled(); // 백엔드 데이터 캐시
    });

    it("중복 콘텐츠 정리", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
        { pageId: "1", blocks: [] }, // 중복
      ]);
      mockCleanDuplicateNoteContent.mockResolvedValue(1);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockCleanDuplicateNoteContent).toHaveBeenCalledWith("note-1");
    });

    it("로드 실패시 에러 상태", async () => {
      mockGetAllNoteContent.mockRejectedValue(new Error("Load failed"));

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("로드 실패");
    });
  });

  describe("자동 저장", () => {
    it("scheduleAutoSave 호출시 2초 후 저장", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      // 로드 완료 대기
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 자동 저장 예약
      act(() => {
        result.current.scheduleAutoSave();
      });

      expect(mockSaveNoteContentAPI).not.toHaveBeenCalled();

      // 2초 경과
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockSaveNoteContentAPI).toHaveBeenCalled();
      });
    });

    it("연속 호출시 디바운스 적용", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 여러 번 호출
      act(() => {
        result.current.scheduleAutoSave();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        result.current.scheduleAutoSave();
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        result.current.scheduleAutoSave();
      });

      // 마지막 호출로부터 2초 경과
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockSaveNoteContentAPI).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("강제 저장", () => {
    it("forceSave 호출시 즉시 저장", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.forceSave();
      });

      expect(mockSaveNoteContentAPI).toHaveBeenCalled();
    });

    it("forceSave 호출시 예약된 자동 저장 취소", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 자동 저장 예약
      act(() => {
        result.current.scheduleAutoSave();
      });

      // 강제 저장
      await act(async () => {
        await result.current.forceSave();
      });

      // 2초 경과해도 추가 저장 없음
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockSaveNoteContentAPI).toHaveBeenCalledTimes(1);
    });
  });

  describe("저장 로직", () => {
    it("selectedFileId 없으면 저장 스킵", async () => {
      mockGetState.mockReturnValue({
        pageNotes: {},
        selectedFileId: null,
      });
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.forceSave();
      });

      expect(mockSaveNoteContentAPI).not.toHaveBeenCalled();
    });

    it("저장할 페이지 없으면 스킵", async () => {
      mockGetState.mockReturnValue({
        pageNotes: {}, // 빈 페이지
        selectedFileId: "file-1",
      });
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.forceSave();
      });

      expect(mockSaveNoteContentAPI).not.toHaveBeenCalled();
    });

    it("저장 성공시 lastSavedAt 업데이트", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lastSavedAt).toBeNull();

      await act(async () => {
        await result.current.forceSave();
      });

      expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    });

    it("저장 실패시 에러 상태", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);
      mockSaveNoteContentAPI.mockRejectedValue(new Error("Save failed"));

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.forceSave();
      });

      expect(result.current.error).toBe("저장 실패");
    });

    it("IndexedDB와 백엔드에 모두 저장", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.forceSave();
      });

      expect(mockSaveToIndexedDB).toHaveBeenCalled();
      expect(mockSaveNoteContentAPI).toHaveBeenCalled();
    });
  });

  describe("언마운트 정리", () => {
    it("언마운트시 타임아웃 정리", async () => {
      mockGetAllNoteContent.mockResolvedValue([
        { pageId: "1", blocks: [] },
      ]);

      const { result, unmount } = renderHook(() =>
        useNoteContent({ noteId: "note-1", enabled: true })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 자동 저장 예약
      act(() => {
        result.current.scheduleAutoSave();
      });

      // 언마운트
      unmount();

      // 2초 경과해도 저장 안 됨 (타임아웃 정리됨)
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockSaveNoteContentAPI).not.toHaveBeenCalled();
    });
  });
});
