/**
 * NoteDataLoader Hook (리팩토링됨)
 * 파일 로드만 담당 (blocks는 BlockNote 에디터가 직접 관리)
 */

import { useEffect } from "react";
import { useNoteEditorStore } from "@/stores";
import { useFilesWithIdByNote } from "@/lib/api/queries/files.queries";
import { useQueryClient } from "@tanstack/react-query";

interface UseNoteDataLoaderProps {
  noteId: string | null;
}

export function useNoteDataLoader({ noteId }: UseNoteDataLoaderProps) {
  const queryClient = useQueryClient();

  const { loadFiles: loadFilesToStore } = useNoteEditorStore();

  // TanStack Query로 파일 목록 조회 (ID 정보 유지)
  const { data: filesWithId = [] } = useFilesWithIdByNote(noteId);

  // 파일 동기화 이벤트 리스너
  useEffect(() => {
    const handleFilesSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ noteId: string }>;
      if (customEvent.detail?.noteId === noteId) {
        console.log('[NoteDataLoader] Files synced, refreshing...');
        queryClient.invalidateQueries({ queryKey: ["files", "note", noteId, "withId"] });
      }
    };

    window.addEventListener('files-synced', handleFilesSync);
    return () => {
      window.removeEventListener('files-synced', handleFilesSync);
    };
  }, [noteId, queryClient]);

  // 파일 목록이 변경되면 스토어에 로드
  useEffect(() => {
    if (!noteId) {
      console.log('[NoteDataLoader] noteId 없음, 파일 초기화');
      loadFilesToStore([]);
      return;
    }

    console.log('[NoteDataLoader] 파일 로드 시작:', {
      noteId,
      filesCount: filesWithId.length,
      files: filesWithId.map(f => ({ id: f.id, name: f.file.name, backendId: f.backendId })),
    });

    // 파일 로드 (ID 정보 유지, backendId 포함)
    const fileItems = filesWithId.map((fileWithId) => ({
      id: fileWithId.id, // IndexedDB DBFile ID 사용 (고유성 보장)
      name: fileWithId.file.name,
      type: fileWithId.file.type,
      size: fileWithId.file.size,
      uploadedAt: new Date(fileWithId.createdAt).toISOString(),
      url: URL.createObjectURL(fileWithId.file),
      backendId: fileWithId.backendId, // Backend File ID (for timeline events)
    }));

    console.log('[NoteDataLoader] Store에 파일 로드:', fileItems.length, '개');
    loadFilesToStore(fileItems);

    // filesWithId.length로 추적하여 무한 루프 방지
    // 함수는 의존성 배열에서 제외 (Zustand 함수는 안정적)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, filesWithId.length]);
}
