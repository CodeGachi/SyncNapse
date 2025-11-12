/**
 * Hook for managing entire note content (all pages)
 * Handles auto-save, loading, and syncing with backend
 * NEW: Saves all pages in a single document
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNoteEditorStore } from '@/stores';
import * as pageContentApi from '@/lib/api/services/page-content.api';
import { saveNoteContent as saveToIndexedDB, getAllNoteContent } from '@/lib/db/notes';
import { initDB } from '@/lib/db';

interface UseNoteContentOptions {
  noteId?: string | null;
  enabled?: boolean;
  autoSaveDelay?: number; // milliseconds
}

export function useNoteContent({
  noteId,
  enabled = true,
  autoSaveDelay = 2000,
}: UseNoteContentOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPagesRef = useRef<string>('');

  /**
   * Load entire note content from IndexedDB or backend
   */
  const loadNoteContent = useCallback(async () => {
    if (!noteId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try IndexedDB first - get all pages for this note
      const allPages = await getAllNoteContent(noteId);
      
      if (allPages && allPages.length > 0) {
        console.log('[useNoteContent] ✅ Loaded from IndexedDB:', allPages.length, 'pages');
        
        // Update store with all loaded pages
        const { selectedFileId, pageNotes } = useNoteEditorStore.getState();
        if (selectedFileId) {
          const updatedPageNotes = { ...pageNotes };
          
          for (const page of allPages) {
            const pageNumber = parseInt(page.pageId, 10);
            if (!isNaN(pageNumber)) {
              const pageKey = `${selectedFileId}-${pageNumber}`;
              updatedPageNotes[pageKey] = page.blocks;
            }
          }
          
          useNoteEditorStore.setState({ pageNotes: updatedPageNotes });
          console.log('[useNoteContent] ✅ Updated store with IndexedDB pages');
        }
        
        return { pages: allPages };
      }

      // Fallback to backend
      const backendContent = await pageContentApi.getNoteContent(noteId);
      
      if (backendContent && backendContent.pages) {
        console.log('[useNoteContent] ✅ Loaded from backend:', Object.keys(backendContent.pages).length, 'pages');
        
        // Save to IndexedDB
        for (const [pageNumber, pageData] of Object.entries(backendContent.pages)) {
          await saveToIndexedDB(noteId, pageNumber, pageData.blocks);
        }
        console.log('[useNoteContent] ✅ Cached to IndexedDB');
        
        // Update store with all loaded pages
        const { selectedFileId, pageNotes } = useNoteEditorStore.getState();
        if (selectedFileId) {
          const updatedPageNotes = { ...pageNotes };
          
          for (const [pageNumber, pageData] of Object.entries(backendContent.pages)) {
            const pageNum = parseInt(pageNumber, 10);
            if (!isNaN(pageNum)) {
              const pageKey = `${selectedFileId}-${pageNum}`;
              updatedPageNotes[pageKey] = pageData.blocks;
            }
          }
          
          useNoteEditorStore.setState({ pageNotes: updatedPageNotes });
          console.log('[useNoteContent] ✅ Updated store with backend pages');
        }
      }

      return backendContent;
    } catch (err) {
      console.error('[useNoteContent] Failed to load note content:', err);
      setError('노트 내용을 불러올 수 없습니다');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [noteId, enabled]);

  /**
   * Save entire note content to IndexedDB and backend
   */
  const saveNoteContent = useCallback(
    async (immediate = false) => {
      if (!noteId || !enabled) return;

      const { pageNotes, selectedFileId } = useNoteEditorStore.getState();
      if (!selectedFileId) return;

      // Build pages object from store
      const pages: { [pageNumber: string]: { blocks: any[] } } = {};
      
      for (const [pageKey, blocks] of Object.entries(pageNotes)) {
        if (pageKey.startsWith(selectedFileId + '-')) {
          const pageNumber = pageKey.substring(selectedFileId.length + 1);
          if (blocks && blocks.length > 0) {
            pages[pageNumber] = { blocks };
          }
        }
      }

      // Check if pages have actually changed
      const currentPagesJson = JSON.stringify(pages);
      if (currentPagesJson === lastSavedPagesRef.current && !immediate) {
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        // Save to IndexedDB immediately
        for (const [pageNumber, pageData] of Object.entries(pages)) {
          await saveToIndexedDB(noteId, pageNumber, pageData.blocks);
        }
        console.log('[useNoteContent] ✅ Saved to IndexedDB (SyncNapseDB)');

        // Save to backend
        await pageContentApi.saveNoteContent(noteId, pages);

        lastSavedPagesRef.current = currentPagesJson;
        setLastSavedAt(new Date());
        console.log('[useNoteContent] ✅ Saved to backend');
      } catch (err) {
        console.error('[useNoteContent] Failed to save note content:', err);
        setError('노트 내용을 저장할 수 없습니다');
        // Content is still in IndexedDB, will be synced later
      } finally {
        setIsSaving(false);
      }
    },
    [noteId, enabled],
  );

  /**
   * Auto-save with debounce
   */
  const scheduleAutoSave = useCallback(() => {
    if (!noteId || !enabled) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save
    saveTimeoutRef.current = setTimeout(() => {
      console.log('[useNoteContent] Auto-save triggered');
      saveNoteContent(false);
    }, autoSaveDelay);
  }, [noteId, enabled, autoSaveDelay, saveNoteContent]);

  /**
   * Force immediate save
   */
  const forceSave = useCallback(async () => {
    if (!noteId || !enabled) return;

    // Cancel any pending auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    await saveNoteContent(true);
  }, [noteId, enabled, saveNoteContent]);

  /**
   * Delete entire note content
   */
  const deleteNoteContent = useCallback(async () => {
    if (!noteId || !enabled) return;

    try {
      // Delete from IndexedDB
      const db = await initDB();
      const transaction = db.transaction(['noteContent'], 'readwrite');
      const store = transaction.objectStore('noteContent');
      const index = store.index('noteId');
      
      // Wrap getAll in a promise
      const allContent = await new Promise<any[]>((resolve, reject) => {
        const request = index.getAll(noteId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      for (const content of allContent) {
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = store.delete(content.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      }
      console.log('[useNoteContent] ✅ Deleted from IndexedDB');

      // Delete from backend
      await pageContentApi.deleteNoteContent(noteId);
      console.log('[useNoteContent] ✅ Deleted from backend');
    } catch (err) {
      console.error('[useNoteContent] Failed to delete note content:', err);
      setError('노트 내용을 삭제할 수 없습니다');
    }
  }, [noteId, enabled]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    isSaving,
    error,
    lastSavedAt,
    loadNoteContent,
    scheduleAutoSave,
    forceSave,
    deleteNoteContent,
  };
}

