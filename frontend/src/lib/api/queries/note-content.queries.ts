/**
 * 노트 컨텐츠 React Query 훅
 * IndexedDB 우선, 백그라운드 백엔드 동기화
 */

import { createLogger } from "@/lib/utils/logger";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const log = createLogger("NoteContentQuery");
import { fetchNoteContentWithSync } from "../services/note-content.api";
import { useEffect } from "react";

/**
 * 노트 컨텐츠 조회 훅
 * - IndexedDB에서 즉시 로드
 * - 백그라운드에서 백엔드와 동기화
 */
export function useNoteContent(noteId: string | null, pageId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['note-content', noteId, pageId],
    queryFn: () => fetchNoteContentWithSync(noteId!, pageId),
    enabled: !!noteId,
    staleTime: 0, // 항상 최신 상태 확인
    gcTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });

  // 동기화 이벤트 리스너
  useEffect(() => {
    if (!noteId) return;

    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ noteId: string; pageId: string }>;
      if (
        customEvent.detail?.noteId === noteId &&
        customEvent.detail?.pageId === pageId
      ) {
        log.debug('Content synced from backend, refreshing cache');
        // 캐시 무효화하여 화면 업데이트
        queryClient.invalidateQueries({ queryKey: ['note-content', noteId, pageId] });
      }
    };

    window.addEventListener('note-content-synced', handleSync);
    return () => window.removeEventListener('note-content-synced', handleSync);
  }, [noteId, pageId, queryClient]);

  return query;
}
