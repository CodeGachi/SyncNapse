/**
 * 노트 데이터 로더 훅
 * 파일 로드만 담당 (blocks는 BlockNote 에디터가 직접 관리)
 */

import { useEffect } from "react";
import { useNoteEditorStore } from "@/stores";
import { useFilesWithIdByNote } from "@/lib/api/queries/files.queries";
import { useQueryClient } from "@tanstack/react-query";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("NoteDataLoader");

interface UseNoteDataLoaderProps {
  noteId: string | null;
  isSharedView?: boolean;
}

export function useNoteDataLoader({ noteId, isSharedView = false }: UseNoteDataLoaderProps) {
  const queryClient = useQueryClient();

  const { loadFiles: loadFilesToStore } = useNoteEditorStore();

  // TanStack Query로 파일 목록 조회 (ID 정보 유지)
  // ⭐ 공유 뷰에서는 쿼리 비활성화 (Liveblocks Storage에서 파일 로드)
  const { data: filesWithId = [] } = useFilesWithIdByNote(noteId, { enabled: !!noteId && !isSharedView });

  // 파일 동기화 이벤트 리스너 (로컬 모드만)
  useEffect(() => {
    // 공유 모드에서는 이벤트 리스너 등록 안함
    if (isSharedView) return;

    const handleFilesSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ noteId: string }>;
      if (customEvent.detail?.noteId === noteId) {
        log.debug("파일 동기화됨, 새로고침...");
        queryClient.invalidateQueries({ queryKey: ["files", "note", noteId, "withId"] });
      }
    };

    window.addEventListener('files-synced', handleFilesSync);
    return () => {
      window.removeEventListener('files-synced', handleFilesSync);
    };
  }, [noteId, queryClient, isSharedView]);

  // 파일 목록이 변경되면 스토어에 로드
  // ⭐ 공유 뷰에서는 스킵 (use-shared-note-data.ts에서 Liveblocks Storage 파일 사용)
  useEffect(() => {
    // 공유 뷰에서는 파일 로드 스킵 (Liveblocks Storage에서 파일 ID를 사용해야 함)
    if (isSharedView) {
      log.debug("공유 뷰 - IndexedDB 파일 로드 스킵 (Liveblocks Storage 사용)");
      return;
    }

    if (!noteId) {
      log.debug("noteId 없음, 파일 초기화");
      loadFilesToStore([]);
      return;
    }

    log.debug("파일 로드 시작:", {
      noteId,
      filesCount: filesWithId.length,
      files: filesWithId.map(f => ({ id: f.id, name: f.file.name, backendId: f.backendId })),
    });

    // 파일 로드 (ID 정보 유지, backendId, backendUrl 포함)
    const fileItems = filesWithId.map((fileWithId) => ({
      id: fileWithId.id, // IndexedDB DBFile ID 사용 (고유성 보장)
      name: fileWithId.file.name,
      type: fileWithId.file.type,
      size: fileWithId.file.size,
      uploadedAt: new Date(fileWithId.createdAt).toISOString(),
      url: URL.createObjectURL(fileWithId.file),
      backendId: fileWithId.backendId, // Backend File ID (for timeline events)
      backendUrl: fileWithId.backendUrl, // Backend storage URL for Liveblocks sharing
    }));

    log.debug("Store에 파일 로드:", fileItems.length, "개");
    loadFilesToStore(fileItems);

    // filesWithId.length로 추적하여 무한 루프 방지
    // 함수는 의존성 배열에서 제외 (Zustand 함수는 안정적)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, filesWithId.length, isSharedView]);
}
