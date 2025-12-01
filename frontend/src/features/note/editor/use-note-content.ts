/**
 * 노트 콘텐츠 훅
 * IndexedDB와 백엔드 간 노트 콘텐츠 저장/로드 및 자동 저장 관리
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNoteEditorStore } from '@/stores/note-editor-store';
import { saveNoteContent as saveNoteContentAPI, getNoteContent as getNoteContentAPI } from '@/lib/api/services/page-content.api';
import { saveNoteContent as saveToIndexedDB, getAllNoteContent, cleanDuplicateNoteContent } from '@/lib/db/notes';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('NoteContent');

interface UseNoteContentProps {
  noteId: string | null | undefined;
  enabled: boolean;
}

export function useNoteContent({ noteId, enabled }: UseNoteContentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadedRef = useRef(false);

  /**
   * IndexedDB와 백엔드에 저장
   */
  const saveNoteContent = useCallback(async () => {
    if (!noteId || !isLoadedRef.current) {
      log.debug('저장 스킵:', { noteId, isLoaded: isLoadedRef.current });
      return;
    }

    log.debug('저장 시작...');
    setIsSaving(true);

    try {
      const { pageNotes, selectedFileId } = useNoteEditorStore.getState();

      if (!selectedFileId) {
        log.debug('selectedFileId 없음');
        setIsSaving(false);
        return;
      }

      // 이 노트의 모든 페이지 수집
      const pages: Record<string, { blocks: any[] }> = {};
      const fileIdPrefix = selectedFileId + '-';

      Object.entries(pageNotes).forEach(([pageKey, blocks]) => {
        if (pageKey.startsWith(fileIdPrefix)) {
          // 페이지 번호 추출: 마지막 '-' 이후
          const pageNumber = pageKey.substring(fileIdPrefix.length);
          log.debug('페이지:', { pageKey, selectedFileId, pageNumber, blockCount: blocks.length });
          pages[pageNumber] = { blocks };
        }
      });

      const pageCount = Object.keys(pages).length;
      log.debug('저장 중', pageCount, '페이지');

      if (pageCount === 0) {
        log.debug('저장할 페이지 없음');
        setIsSaving(false);
        return;
      }

      // 1. IndexedDB에 저장
      for (const [pageNumber, pageData] of Object.entries(pages)) {
        await saveToIndexedDB(noteId, String(pageNumber), pageData.blocks);
      }
      log.debug('IndexedDB에 저장 완료');

      // 2. 백엔드에 저장 (PostgreSQL + MinIO)
      await saveNoteContentAPI(noteId, pages);
      log.debug('백엔드에 저장 완료');

      setLastSavedAt(new Date());
    } catch (err) {
      log.error('저장 실패:', err);
      setError('저장 실패');
    } finally {
      setIsSaving(false);
    }
  }, [noteId]);

  /**
   * 자동 저장 예약 (타이핑 멈춘 후 2초)
   */
  const scheduleAutoSave = useCallback(() => {
    if (!isLoadedRef.current) {
      log.debug('아직 로드되지 않음 - 자동 저장 스킵');
      return;
    }

    // 기존 타임아웃 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 새 저장 예약
    log.debug('자동 저장 예약 (2초)');
    saveTimeoutRef.current = setTimeout(() => {
      log.debug('자동 저장 실행');
      saveNoteContent();
    }, 2000);
  }, [saveNoteContent]);

  /**
   * 즉시 강제 저장 (페이지 변경 시)
   */
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    log.debug('강제 저장 (페이지 변경)');
    await saveNoteContent();
  }, [saveNoteContent]);

  /**
   * IndexedDB(우선) 또는 백엔드에서 콘텐츠 로드
   */
  const loadNoteContent = useCallback(async () => {
    if (!noteId || !enabled) {
      log.debug('로드 스킵:', { noteId, enabled });
      return;
    }

    log.debug('콘텐츠 로드 중:', noteId);
    setIsLoading(true);
    setError(null);
    isLoadedRef.current = false;

    try {
      const { selectedFileId } = useNoteEditorStore.getState();

      if (!selectedFileId) {
        log.debug('selectedFileId 없음 - 대기 중...');
        setIsLoading(false);
        return;
      }

      // 1. IndexedDB 우선 시도
      let allPages = await getAllNoteContent(noteId);

      if (allPages && allPages.length > 0) {
        log.debug('IndexedDB에서 발견:', allPages.length, '페이지');

        // 중복 정리
        const duplicatesRemoved = await cleanDuplicateNoteContent(noteId);
        if (duplicatesRemoved > 0) {
          log.debug('중복 정리됨:', duplicatesRemoved);
          allPages = await getAllNoteContent(noteId);
        }
      } else {
        // 2. 백엔드에서 로드 (PostgreSQL + MinIO)
        log.debug('백엔드에서 로드 중...');
        const backendData = await getNoteContentAPI(noteId);

        log.debug('백엔드 응답:', {
          hasData: !!backendData,
          hasPages: !!backendData?.pages,
          pagesType: typeof backendData?.pages,
          pageCount: Object.keys(backendData?.pages || {}).length,
          pageKeys: Object.keys(backendData?.pages || {}),
        });

        if (backendData && backendData.pages) {
          const pageKeys = Object.keys(backendData.pages);
          log.debug('백엔드에서 로드 완료 - 페이지:', pageKeys.join(', '));

          // 첫 페이지 디버그
          const firstPageKey = pageKeys[0];
          if (firstPageKey && backendData.pages[firstPageKey]) {
            const firstPage = backendData.pages[firstPageKey] as { blocks: any[] };
            log.debug(`첫 번째 페이지 (${firstPageKey}):`, {
              hasBlocks: !!firstPage.blocks,
              blocksIsArray: Array.isArray(firstPage.blocks),
              blockCount: firstPage.blocks?.length || 0,
              firstBlockContent: firstPage.blocks?.[0]?.content,
            });
          }

          // 다음을 위해 IndexedDB에 저장
          for (const [pageNumber, pageData] of Object.entries(backendData.pages)) {
            const typedPageData = pageData as { blocks: any[] };
            log.debug(`페이지 ${pageNumber} IndexedDB에 저장:`, {
              hasBlocks: !!typedPageData.blocks,
              blockCount: typedPageData.blocks?.length || 0,
            });
            await saveToIndexedDB(noteId, pageNumber, typedPageData.blocks);
          }
          log.debug('IndexedDB에 캐시됨');

          // IndexedDB에서 다시 로드
          allPages = await getAllNoteContent(noteId);
          log.debug('IndexedDB에서 다시 로드:', allPages?.length || 0, '페이지');
        } else {
          log.warn('백엔드에서 데이터 로드 안됨!');
        }
      }

      // 로드된 데이터로 스토어 업데이트
      if (allPages && allPages.length > 0) {
        const updatedPageNotes: Record<string, any[]> = {};

        for (const page of allPages) {
          const pageNumber = parseInt(page.pageId, 10);
          if (!isNaN(pageNumber)) {
            const pageKey = `${selectedFileId}-${pageNumber}`;
            updatedPageNotes[pageKey] = page.blocks;
          }
        }

        useNoteEditorStore.setState({ pageNotes: updatedPageNotes });
        log.debug('스토어에 로드 완료:', Object.keys(updatedPageNotes).length, '페이지');
      }

      isLoadedRef.current = true;
    } catch (err) {
      log.error('로드 실패:', err);
      setError('로드 실패');
      isLoadedRef.current = true; // 로드 실패해도 저장 허용
    } finally {
      setIsLoading(false);
    }
  }, [noteId, enabled]);

  /**
   * selectedFileId 구독
   */
  const selectedFileId = useNoteEditorStore(state => state.selectedFileId);

  /**
   * noteId, enabled, selectedFileId 변경 시 로드
   */
  useEffect(() => {
    log.debug('조건:', { noteId, enabled, selectedFileId });

    if (noteId && enabled && selectedFileId) {
      log.debug('로드 중...');
      loadNoteContent();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteId, enabled, selectedFileId, loadNoteContent]);

  /**
   * 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    isLoading,
    isSaving,
    error,
    lastSavedAt,
    scheduleAutoSave,
    forceSave,
  };
}
