/**
 * Hook for managing page-specific note content
 * Handles auto-save, loading, and syncing with backend
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNoteEditorStore } from '@/stores';
import * as pageContentApi from '@/lib/api/services/page-content.api';
import { saveNoteContent, getNoteContent } from '@/lib/db/notes';

interface UsePageContentOptions {
  noteId?: string | null;
  pageNumber: number;
  enabled?: boolean;
  autoSaveDelay?: number; // milliseconds
}

export function usePageContent({
  noteId,
  pageNumber,
  enabled = true,
  autoSaveDelay = 2000, // 2 seconds default
}: UsePageContentOptions) {
  const { getCurrentPageBlocks } = useNoteEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedBlocksRef = useRef<string>('');

  /**
   * Load page content from IndexedDB or backend
   */
  const loadPageContent = useCallback(async () => {
    if (!noteId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try IndexedDB first
      const localContent = await getNoteContent(noteId, pageNumber.toString());

      if (localContent && localContent.blocks.length > 0) {
        console.log('[usePageContent] ✅ Loaded from IndexedDB');
        
        // Update store with loaded blocks
        const { selectedFileId } = useNoteEditorStore.getState();
        if (selectedFileId) {
          const pageKey = `${selectedFileId}-${pageNumber}`;
          useNoteEditorStore.setState((state) => ({
            pageNotes: {
              ...state.pageNotes,
              [pageKey]: localContent.blocks,
            },
          }));
          console.log('[usePageContent] ✅ Updated store with IndexedDB blocks for', pageKey);
        }
        
        return {
          noteId: localContent.noteId,
          pageNumber,
          blocks: localContent.blocks,
          version: 1,
        };
      }

      // Fallback to backend
      const backendContent = await pageContentApi.getPageContent(
        noteId,
        pageNumber,
      );

      // Cache in IndexedDB
      if (backendContent && backendContent.blocks.length > 0) {
        await saveNoteContent(
          noteId,
          pageNumber.toString(),
          backendContent.blocks,
        );
        console.log('[usePageContent] ✅ Cached to IndexedDB');
        
        // Update store with loaded blocks
        const { selectedFileId } = useNoteEditorStore.getState();
        if (selectedFileId) {
          const pageKey = `${selectedFileId}-${pageNumber}`;
          useNoteEditorStore.setState((state) => ({
            pageNotes: {
              ...state.pageNotes,
              [pageKey]: backendContent.blocks,
            },
          }));
          console.log('[usePageContent] ✅ Updated store with loaded blocks for', pageKey);
        }
      }

      console.log('[usePageContent] ✅ Loaded from backend');
      return backendContent;
    } catch (err) {
      console.error('[usePageContent] Failed to load page content:', err);
      setError('페이지 내용을 불러올 수 없습니다');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [noteId, pageNumber, enabled]);

  /**
   * Save page content to IndexedDB and backend
   */
  const savePageContent = useCallback(
    async (blocks: pageContentApi.NoteBlock[], immediate = false) => {
      if (!noteId || !enabled) return;

      // Check if blocks have actually changed
      const currentBlocksJson = JSON.stringify(blocks);
      if (currentBlocksJson === lastSavedBlocksRef.current && !immediate) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        // Save to IndexedDB immediately (using existing SyncNapseDB)
        await saveNoteContent(noteId, pageNumber.toString(), blocks);
        console.log('[usePageContent] ✅ Saved to IndexedDB (SyncNapseDB)');

        // Save to backend
        await pageContentApi.savePageContent(noteId, pageNumber, blocks);

        lastSavedBlocksRef.current = currentBlocksJson;
        setLastSavedAt(new Date());
        console.log('[usePageContent] ✅ Saved to backend');
      } catch (err) {
        console.error('[usePageContent] Failed to save page content:', err);
        setError('페이지 내용을 저장할 수 없습니다');
        // Content is still in IndexedDB, will be synced later
      } finally {
        setIsSaving(false);
      }
    },
    [noteId, pageNumber, enabled],
  );

  /**
   * Auto-save with debounce
   */
  const scheduleAutoSave = useCallback(
    (blocks: pageContentApi.NoteBlock[]) => {
      if (!noteId || !enabled) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule new save
      saveTimeoutRef.current = setTimeout(() => {
        savePageContent(blocks, false);
      }, autoSaveDelay);
    },
    [noteId, enabled, autoSaveDelay, savePageContent],
  );

  /**
   * Manual save (immediate)
   */
  const manualSave = useCallback(async () => {
    if (!noteId || !enabled) return;

    const blocks = getCurrentPageBlocks();
    await savePageContent(blocks, true);
  }, [noteId, enabled, getCurrentPageBlocks, savePageContent]);

  /**
   * Delete page content
   */
  const deletePageContent = useCallback(async () => {
    if (!noteId || !enabled) return;

    try {
      // Delete from IndexedDB
      const { initDB } = await import('@/lib/db');
      const db = await initDB();
      const transaction = db.transaction(['noteContent'], 'readwrite');
      const store = transaction.objectStore('noteContent');
      await store.delete(`${noteId}-${pageNumber}`);
      console.log('[usePageContent] ✅ Deleted from IndexedDB');

      // Delete from backend
      await pageContentApi.deletePageContent(noteId, pageNumber);
      console.log('[usePageContent] ✅ Deleted from backend');
    } catch (err) {
      console.error('[usePageContent] Failed to delete page content:', err);
      setError('페이지 내용을 삭제할 수 없습니다');
    }
  }, [noteId, pageNumber, enabled]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadPageContent,
    savePageContent,
    scheduleAutoSave,
    manualSave,
    deletePageContent,
    isSaving,
    isLoading,
    lastSavedAt,
    error,
  };
}

