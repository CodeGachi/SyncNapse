/**
 * Note panel component (BlockNote-based editor)
 * Load content only on initial mount and page change
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useNoteEditorStore } from "@/stores";
import { useNoteContent } from "@/features/note/editor/use-note-content";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { LoadingScreen } from "@/components/common/loading-screen";
import { Spinner } from "@/components/common/spinner";

interface NotePanelProps {
  isOpen: boolean;
  noteId?: string | null;
}

export function NotePanel({ isOpen, noteId }: NotePanelProps) {
  const {
    pageNotes,
    updatePageBlocksFromBlockNote,
    currentPage,
    selectedFileId,
  } = useNoteEditorStore();

  // Auto-save hook (always load content when noteId exists, regardless of panel open/close state)
  const { scheduleAutoSave, forceSave, isSaving, lastSavedAt, isLoading } = useNoteContent({
    noteId,
    enabled: !!noteId,
  });

  // Track if we should load content
  const [shouldLoadContent, setShouldLoadContent] = useState(true);
  const prevPageRef = useRef<number>(currentPage);
  const isInitialMountRef = useRef(true);
  const hasLoadedRef = useRef(false);
  const prevNoteIdRef = useRef<string | null | undefined>(noteId);

  // Reset hasLoadedRef when noteId changes (switching to different note)
  useEffect(() => {
    if (prevNoteIdRef.current !== noteId) {
      console.log('[NotePanel] 📝 Note changed, resetting load state');
      hasLoadedRef.current = false;
      setShouldLoadContent(true);
      prevNoteIdRef.current = noteId;
    }
  }, [noteId]);

  /**
   * Get initial content for editor
   * Convert pageNotes to BlockNote format
   */
  const initialContent = useMemo(() => {
    const pageKey = selectedFileId ? `${selectedFileId}-${currentPage}` : null;
    const blocks = pageKey ? pageNotes[pageKey] : null;

    console.log('[NotePanel] 📋 Building content:', {
      pageKey,
      hasBlocks: !!blocks,
      blockCount: blocks?.length || 0,
      firstBlockContent: blocks?.[0]?.content,
    });

    if (!blocks || blocks.length === 0) {
      return [{
        type: "paragraph",
        content: "",
      }] as PartialBlock[];
    }

    return blocks.map((block: any) => {
      const blockType = mapTypeToBlockNote(block.type);

      if (block.type === "checkbox") {
        return {
          type: "checkListItem" as const,
          content: block.content || "",
          props: {
            checked: block.checked || false,
          },
        } as PartialBlock;
      }

      return {
        type: blockType,
        content: block.content || "",
      } as PartialBlock;
    });
  }, [currentPage, selectedFileId, pageNotes]);

  /**
   * Create BlockNote editor with initial content
   */
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  });

  /**
   * Handle page change - save current and load new page
   */
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevPageRef.current = currentPage;
      console.log('[NotePanel] ⏭️ Initial mount');
      return;
    }

    // Only trigger on actual page change
    if (prevPageRef.current !== currentPage) {
      console.log('[NotePanel] 📄 Page changed:', prevPageRef.current, '->', currentPage);
      prevPageRef.current = currentPage;

      // Save current page
      if (!isLoading) {
        forceSave();
      }

      // Reset load flag and trigger content reload
      hasLoadedRef.current = false;
      setShouldLoadContent(true);
    }
  }, [currentPage, isLoading, forceSave]);

  /**
   * Load content into editor on initial load
   * Wait for data to be loaded from IndexedDB
   */
  useEffect(() => {
    if (!isLoading && !hasLoadedRef.current && editor) {
      const pageKey = selectedFileId ? `${selectedFileId}-${currentPage}` : null;
      const pageData = pageKey ? pageNotes[pageKey] : null;
      const hasActualData = pageData && pageData.length > 0 && pageData[0].content !== "";
      const hasAnyData = Object.keys(pageNotes).length > 0;

      console.log('[NotePanel] 🔍 Checking for data:', {
        hasActualData,
        hasAnyData,
        pageDataLength: pageData?.length,
        firstBlockContent: pageData?.[0]?.content,
        pageNotesKeys: Object.keys(pageNotes).slice(0, 3),
      });

      // Only mark as loaded when we have actual content data
      // This ensures we wait for IndexedDB load to complete
      if (hasActualData && initialContent) {
        console.log('[NotePanel] 🔄 Initial load - updating editor with loaded data');
        editor.replaceBlocks(editor.document, initialContent);
        hasLoadedRef.current = true;
        setShouldLoadContent(false);
      } else if (!hasAnyData) {
        console.log('[NotePanel] ⏸️ Waiting for data from IndexedDB...');
      } else {
        console.log('[NotePanel] ⏸️ Has store data but waiting for actual content...');
      }
    }
  }, [isLoading, editor, initialContent, selectedFileId, currentPage, pageNotes]);

  /**
   * Load content into editor when page changes
   */
  useEffect(() => {
    if (shouldLoadContent && editor && initialContent && !isLoading) {
      console.log('[NotePanel] 🔄 Page changed - updating editor');
      editor.replaceBlocks(editor.document, initialContent);
      setShouldLoadContent(false);
    }
  }, [shouldLoadContent, editor, initialContent, isLoading]);

  /**
   * Handle editor change - schedule auto-save
   */
  const handleEditorChange = () => {
    if (!editor || isLoading) {
      return;
    }

    const blocks = editor.document as Block[];
    console.log('[NotePanel] ✏️ Content changed');

    // Update store
    updatePageBlocksFromBlockNote(blocks);

    // Schedule auto-save (2 seconds after typing stops)
    scheduleAutoSave();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="h-full flex flex-col rounded-[15px] border border-gray-700 p-1 gap-2.5" style={{ backgroundColor: '#2f2f2f' }}>
      {/* Header with save status */}
      <div className="flex items-center justify-between px-2 py-1 border-b" style={{ borderColor: '#565656' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">
            Page {currentPage}
          </span>
          {isSaving && (
            <span className="text-[10px] text-blue-400 flex items-center gap-1">
              <Spinner size="xs" />
              저장 중...
            </span>
          )}
          {!isSaving && lastSavedAt && (
            <span className="text-[10px] text-gray-400">
              저장됨 {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingScreen message="로딩 중..." />
        ) : (
          <div
            className="h-full rounded-[15px] border border-gray-700 p-4"
            style={{
              backgroundColor: '#1e1e1e',
            }}
          >
            <style dangerouslySetInnerHTML={{
              __html: `
                .bn-container .bn-editor {
                  background-color: #1e1e1e !important;
                  color: #ffffff !important;
                }
                .bn-container .bn-block-content {
                  color: #ffffff !important;
                }
                .bn-container [data-content-type] {
                  color: #ffffff !important;
                }
                .bn-container .ProseMirror {
                  color: #ffffff !important;
                }
                .bn-container .bn-inline-content {
                  color: #ffffff !important;
                }
                .bn-container p {
                  color: #ffffff !important;
                }
              `
            }} />
            <BlockNoteView
              editor={editor}
              onChange={handleEditorChange}
              theme="light"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Map internal type to BlockNote type
 */
function mapTypeToBlockNote(type: string): string {
  const mapping: Record<string, string> = {
    text: "paragraph",
    heading1: "heading",
    heading2: "heading",
    heading3: "heading",
    bullet: "bulletListItem",
    number: "numberedListItem",
    checkbox: "checkListItem",
    quote: "paragraph",
    code: "paragraph",
  };

  return mapping[type] || "paragraph";
}
