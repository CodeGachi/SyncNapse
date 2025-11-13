/**
 * Note panel component (BlockNote-based editor)
 * Clean implementation with auto-save on typing and page change
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useNoteEditorStore } from "@/stores";
import { useNoteContent } from "@/features/note/editor/use-note-content";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

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

  // Auto-save hook
  const { scheduleAutoSave, forceSave, isSaving, lastSavedAt, isLoading } = useNoteContent({
    noteId,
    enabled: !!noteId && isOpen,
  });

  // Track initial mount and previous page
  const isInitialMountRef = useRef(true);
  const prevPageRef = useRef<number>(currentPage);

  /**
   * Handle page change - save immediately
   */
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevPageRef.current = currentPage;
      console.log('[NotePanel] ⏭️ Initial mount - skipping save');
      return;
    }

    // Only save if page actually changed
    if (prevPageRef.current !== currentPage) {
      console.log('[NotePanel] 📄 Page changed:', prevPageRef.current, '->', currentPage);
      prevPageRef.current = currentPage;

      // Don't save while loading
      if (!isLoading) {
        forceSave();
      }
    }
  }, [currentPage, isLoading, forceSave]);

  /**
   * Convert NoteBlock to BlockNote format
   */
  const blocknoteContent = useMemo(() => {
    // Get current page key
    const pageKey = selectedFileId ? `${selectedFileId}-${currentPage}` : null;
    const blocks = pageKey ? pageNotes[pageKey] : null;
    
    console.log('[NotePanel] 📋 blocknoteContent computed:', { 
      pageKey, 
      hasBlocks: !!blocks, 
      blockCount: blocks?.length || 0,
      firstBlockContent: blocks && blocks.length > 0 ? (blocks[0] as any)?.content : 'N/A'
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
   * Create BlockNote editor
   */
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: blocknoteContent,
  });

  /**
   * Track previous content to prevent infinite loop
   */
  const prevContentRef = useRef<string>('');
  const hasLoadedRef = useRef<boolean>(false);

  /**
   * Update editor content when loading completes (initial load)
   */
  useEffect(() => {
    if (!isLoading && !hasLoadedRef.current && editor && blocknoteContent) {
      console.log('[NotePanel] ✅ Initial load complete - updating editor');
      hasLoadedRef.current = true;
      prevContentRef.current = JSON.stringify(blocknoteContent);
      editor.replaceBlocks(editor.document, blocknoteContent);
    }
  }, [isLoading, editor, blocknoteContent]);

  /**
   * Update editor content when page changes
   */
  useEffect(() => {
    if (editor && blocknoteContent && hasLoadedRef.current) {
      const contentString = JSON.stringify(blocknoteContent);
      
      // Only update if content actually changed
      if (contentString !== prevContentRef.current) {
        console.log('[NotePanel] 🔄 Updating editor content for page:', currentPage);
        prevContentRef.current = contentString;
        editor.replaceBlocks(editor.document, blocknoteContent);
      }
    }
  }, [blocknoteContent, currentPage]);

  /**
   * Handle editor change - schedule auto-save
   */
  const handleEditorChange = () => {
    if (!editor) {
      return;
    }

    // Don't update store during initial load
    if (isLoading || !hasLoadedRef.current) {
      console.log('[NotePanel] ⏸️ Skipping update during load');
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
    <div className="h-full flex flex-col rounded-lg shadow-sm mt-4" style={{ backgroundColor: '#252525' }}>
      {/* Header with save status */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#3a3a3a' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">
            Page {currentPage}
          </span>
          {isSaving && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              저장 중...
            </span>
          )}
          {!isSaving && lastSavedAt && (
            <span className="text-xs text-gray-400">
              저장됨 {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">로딩 중...</div>
          </div>
        ) : (
          <div 
            className="h-full rounded-md p-4" 
            style={{ 
              backgroundColor: '#1a1a1a',
            }}
          >
            <style dangerouslySetInnerHTML={{
              __html: `
                .bn-container .bn-editor {
                  background-color: #1a1a1a !important;
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
