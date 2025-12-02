/**
 * Note Content API Service
 * IndexedDB를 단일 진실 공급원으로, 백엔드는 백그라운드 동기화
 */

import { createLogger } from "@/lib/utils/logger";
import { saveNoteContent as saveNoteContentInDB, getNoteContent as getNoteContentFromDB } from "@/lib/db/notes";

const log = createLogger("NoteContentAPI");
import { getAuthHeaders } from "../client";
// import { getSyncQueue } from "@/lib/sync"; // TODO: Use useSyncStore instead

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * 노트 컨텐츠 조회 (백그라운드 동기화 포함)
 * 1. IndexedDB에서 로컬 데이터 즉시 반환
 * 2. 백그라운드에서 백엔드와 동기화
 */
export async function fetchNoteContentWithSync(
  noteId: string,
  pageId: string
): Promise<any[]> {
  log.debug('fetchNoteContentWithSync:', { noteId, pageId });

  // 1. IndexedDB에서 로컬 데이터 먼저 가져오기
  const localContent = await getNoteContentFromDB(noteId, pageId);
  const localBlocks = localContent?.blocks || [];

  log.debug('Local IndexedDB result:', {
    hasContent: !!localContent,
    blocksCount: localBlocks.length,
    updatedAt: localContent?.updatedAt,
    syncedAt: localContent?.syncedAt,
  });

  // 2. 백그라운드에서 백엔드 동기화 시작
  syncFromBackendInBackground(noteId, pageId, localContent);

  // 3. 로컬 데이터 즉시 반환
  return localBlocks;
}

/**
 * 백그라운드 백엔드 동기화
 * - 백엔드에서 최신 데이터 가져오기
 * - 타임스탬프 비교하여 충돌 해결
 */
async function syncFromBackendInBackground(
  noteId: string,
  pageId: string,
  localContent: any | null
): Promise<void> {
  try {
    log.debug('🔄 Background sync started:', { noteId, pageId });

    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/content/${pageId}`, {
      credentials: 'include',
      headers: { ...getAuthHeaders() },
    });

    if (!res.ok) {
      if (res.status === 404) {
        log.debug('ℹ️ Content not found on backend (404)');
        return;
      }
      log.warn('⚠️ Failed to fetch from backend:', res.status);
      return;
    }

    const data = await res.json();
    const serverBlocks = data.blocks || [];
    const serverUpdatedAt = data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now();

    log.debug('Backend response:', {
      blocksCount: serverBlocks.length,
      serverUpdatedAt,
      localUpdatedAt: localContent?.updatedAt,
    });

    // 충돌 해결: 타임스탬프 비교
    if (!localContent || serverUpdatedAt > localContent.updatedAt) {
      // 서버가 더 최신이면 IndexedDB 업데이트
      await saveNoteContentInDB(noteId, pageId, serverBlocks, serverUpdatedAt, true);

      log.info('✅ Synced from backend (server is newer)');

      // React Query 캐시 무효화 이벤트 발생
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('note-content-synced', {
          detail: { noteId, pageId }
        }));
      }
    } else {
      log.debug('✅ Local is up-to-date or newer');

      // 로컬이 더 최신이면 백엔드로 동기화 큐에 추가
      if (localContent.updatedAt > (localContent.syncedAt || 0)) {
        log.debug('📤 Local changes need to sync to backend');
        // TODO: Implement retry queue using useSyncStore
        // getSyncQueue().addTask('note-content', {
        //   noteId,
        //   pageId,
        //   blocks: localContent.blocks,
        // });
      }
    }
  } catch (error) {
    log.error('❌ Background sync failed:', error);
  }
}

/**
 * 노트 컨텐츠 저장 (IndexedDB → Backend)
 * 1. IndexedDB에 즉시 저장
 * 2. 백그라운드에서 백엔드 동기화 큐에 추가
 */
export async function saveNoteContentWithSync(
  noteId: string,
  pageId: string,
  blocks: any[]
): Promise<void> {
  log.debug('saveNoteContentWithSync:', {
    noteId,
    pageId,
    blocksCount: blocks.length,
  });

  // 1. IndexedDB에 즉시 저장
  await saveNoteContentInDB(noteId, pageId, blocks);
  log.info('✅ Saved to IndexedDB');

  // 2. 백그라운드 동기화 큐에 추가
  // TODO: Implement retry queue using useSyncStore
  // getSyncQueue().addTask('note-content', { noteId, pageId, blocks });
  log.debug('📤 Saved (background sync TODO)');
}
