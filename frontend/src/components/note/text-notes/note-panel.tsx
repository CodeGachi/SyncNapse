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

  // Track if we should load content
  const [shouldLoadContent, setShouldLoadContent] = useState(true);
  const prevPageRef = useRef<number>(currentPage);
  const isInitialMountRef = useRef(true);

  /**
   * Get initial content for editor
   * Only load from store when shouldLoadContent is true
   */
  const initialContent = useMemo(() => {
    if (!shouldLoadContent) {
      // Don't load - let editor keep its current state
      return null;
    }

    const pageKey = selectedFileId ? `${selectedFileId}-${currentPage}` : null;
    const blocks = pageKey ? pageNotes[pageKey] : null;
    
    console.log('[NotePanel] 📋 Loading content:', { 
      pageKey, 
      hasBlocks: !!blocks, 
      blockCount: blocks?.length || 0,
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
  }, [shouldLoadContent, currentPage, selectedFileId, pageNotes]);

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

      // Trigger content reload
      setShouldLoadContent(true);
    }
  }, [currentPage, isLoading, forceSave]);

  /**
   * Load content into editor when shouldLoadContent is true
   */
  useEffect(() => {
    if (!shouldLoadContent || !editor || !initialContent || isLoading) {
      return;
    }

    console.log('[NotePanel] 🔄 Updating editor with loaded content');
    
    // Update editor content
    editor.replaceBlocks(editor.document, initialContent);
    
    // Reset flag - don't load again until page changes
    setShouldLoadContent(false);
  }, [shouldLoadContent, editor, initialContent, isLoading]);

  /**
   * Reset shouldLoadContent when loading completes
   */
  useEffect(() => {
    if (!isLoading) {
      setShouldLoadContent(true);
    }
  }, [isLoading]);

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
