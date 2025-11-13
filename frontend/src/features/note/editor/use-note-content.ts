import { useState, useEffect, useCallback, useRef } from 'react';
import { useNoteEditorStore } from '@/stores/note-editor-store';
import { saveNoteContent as saveNoteContentAPI, getNoteContent as getNoteContentAPI } from '@/lib/api/services/page-content.api';
import { saveNoteContent as saveToIndexedDB, getAllNoteContent, cleanDuplicateNoteContent } from '@/lib/db/notes';

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
   * Save to IndexedDB and Backend
   */
  const saveNoteContent = useCallback(async () => {
    if (!noteId || !isLoadedRef.current) {
      console.log('[useNoteContent] ⏸️ Skip save:', { noteId, isLoaded: isLoadedRef.current });
      return;
    }

    console.log('[useNoteContent] 💾 Starting save...');
    setIsSaving(true);

    try {
      const { pageNotes, selectedFileId } = useNoteEditorStore.getState();

      if (!selectedFileId) {
        console.log('[useNoteContent] ⏸️ No selectedFileId');
        setIsSaving(false);
        return;
      }

      // Collect all pages for this note
      const pages: Record<string, { blocks: any[] }> = {};
      const fileIdPrefix = selectedFileId + '-';
      
      Object.entries(pageNotes).forEach(([pageKey, blocks]) => {
        if (pageKey.startsWith(fileIdPrefix)) {
          // Extract page number: it's after the last '-'
          const pageNumber = pageKey.substring(fileIdPrefix.length);
          console.log('[useNoteContent] 📄 Page:', { pageKey, selectedFileId, pageNumber, blockCount: blocks.length });
          pages[pageNumber] = { blocks };
        }
      });

      const pageCount = Object.keys(pages).length;
      console.log('[useNoteContent] 📦 Saving', pageCount, 'pages');

      if (pageCount === 0) {
        console.log('[useNoteContent] ⏸️ No pages to save');
        setIsSaving(false);
        return;
      }

      // 1. Save to IndexedDB
      for (const [pageNumber, pageData] of Object.entries(pages)) {
        await saveToIndexedDB(noteId, String(pageNumber), pageData.blocks);
      }
      console.log('[useNoteContent] ✅ Saved to IndexedDB');

      // 2. Save to Backend (PostgreSQL + MinIO)
      await saveNoteContentAPI(noteId, pages);
      console.log('[useNoteContent] ✅ Saved to Backend');

      setLastSavedAt(new Date());
    } catch (err) {
      console.error('[useNoteContent] ❌ Save failed:', err);
      setError('저장 실패');
    } finally {
      setIsSaving(false);
    }
  }, [noteId]);

  /**
   * Schedule auto-save (2 seconds after typing stops)
   */
  const scheduleAutoSave = useCallback(() => {
    if (!isLoadedRef.current) {
      console.log('[useNoteContent] ⏸️ Not loaded yet - skip auto-save');
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule new save
    console.log('[useNoteContent] ⏰ Auto-save scheduled (2 seconds)');
    saveTimeoutRef.current = setTimeout(() => {
      console.log('[useNoteContent] ⏰ Auto-save triggered');
      saveNoteContent();
    }, 2000);
  }, [saveNoteContent]);

  /**
   * Force save immediately (on page change)
   */
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    console.log('[useNoteContent] 🚀 Force save (page change)');
    await saveNoteContent();
  }, [saveNoteContent]);

  /**
   * Load content from IndexedDB (priority) or Backend
   */
  const loadNoteContent = useCallback(async () => {
    if (!noteId || !enabled) {
      console.log('[useNoteContent] ⏭️ Skip load:', { noteId, enabled });
      return;
    }

    console.log('[useNoteContent] 📂 Loading content for:', noteId);
    setIsLoading(true);
    setError(null);
    isLoadedRef.current = false;

    try {
      const { selectedFileId } = useNoteEditorStore.getState();
      
      if (!selectedFileId) {
        console.log('[useNoteContent] ⏸️ No selectedFileId - waiting...');
        setIsLoading(false);
        return;
      }

      // 1. Try IndexedDB first
      let allPages = await getAllNoteContent(noteId);
      
      if (allPages && allPages.length > 0) {
        console.log('[useNoteContent] ✅ Found in IndexedDB:', allPages.length, 'pages');
        
        // Clean duplicates
        const duplicatesRemoved = await cleanDuplicateNoteContent(noteId);
        if (duplicatesRemoved > 0) {
          console.log('[useNoteContent] 🧹 Cleaned', duplicatesRemoved, 'duplicates');
          allPages = await getAllNoteContent(noteId);
        }
      } else {
        // 2. Load from Backend (PostgreSQL + MinIO)
        console.log('[useNoteContent] 📥 Loading from Backend...');
        const backendData = await getNoteContentAPI(noteId);
        
        if (backendData && backendData.pages) {
          console.log('[useNoteContent] ✅ Loaded from Backend');
          
          // Save to IndexedDB for next time
          for (const [pageNumber, pageData] of Object.entries(backendData.pages)) {
            const typedPageData = pageData as { blocks: any[] };
            await saveToIndexedDB(noteId, pageNumber, typedPageData.blocks);
          }
          console.log('[useNoteContent] ✅ Cached to IndexedDB');
          
          // Reload from IndexedDB
          allPages = await getAllNoteContent(noteId);
        }
      }

      // Update store with loaded data
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
        console.log('[useNoteContent] ✅ Loaded to store:', Object.keys(updatedPageNotes).length, 'pages');
      }

      isLoadedRef.current = true;
    } catch (err) {
      console.error('[useNoteContent] ❌ Load failed:', err);
      setError('로드 실패');
      isLoadedRef.current = true; // Allow saves even if load failed
    } finally {
      setIsLoading(false);
    }
  }, [noteId, enabled]);

  /**
   * Subscribe to selectedFileId
   */
  const selectedFileId = useNoteEditorStore(state => state.selectedFileId);

  /**
   * Load when noteId, enabled, or selectedFileId changes
   */
  useEffect(() => {
    console.log('[useNoteContent] 🔄 Conditions:', { noteId, enabled, selectedFileId });
    
    if (noteId && enabled && selectedFileId) {
      console.log('[useNoteContent] ✅ Loading...');
      loadNoteContent();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteId, enabled, selectedFileId, loadNoteContent]);

  /**
   * Cleanup on unmount
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
