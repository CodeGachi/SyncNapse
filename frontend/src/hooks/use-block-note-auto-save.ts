/**
 * BlockNote 자동저장 훅
 * BlockNote 에디터에서 직접 IndexedDB로 저장, Zustand 제거
 */

"use client";

import { useEffect, useRef } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { saveNoteContentWithSync } from "@/lib/api/services/note-content.api";

interface UseBlockNoteAutoSaveOptions {
  noteId: string;
  pageId: string;
  editor: BlockNoteEditor | null;
  debounceMs?: number;
  enabled?: boolean;
}

export function useBlockNoteAutoSave({
  noteId,
  pageId,
  editor,
  debounceMs = 2000, // 2초 디바운스 (30초보다 짧게)
  enabled = true,
}: UseBlockNoteAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!editor || !enabled || !noteId || !pageId) return;

    // 초기 마운트 시에는 저장하지 않음
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handleChange = async () => {
      console.log('[useBlockNoteAutoSave] Editor content changed');

      // 이전 타이머 취소
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 디바운스
      timeoutRef.current = setTimeout(async () => {
        try {
          const blocks = editor.document;
          console.log('[useBlockNoteAutoSave] Saving to IndexedDB:', {
            noteId,
            pageId,
            blocksCount: blocks.length,
          });

          // IndexedDB에 저장 + 백그라운드 동기화 큐에 추가
          await saveNoteContentWithSync(noteId, pageId, blocks);

          console.log('[useBlockNoteAutoSave] ✅ Auto-save completed');
        } catch (error) {
          console.error('[useBlockNoteAutoSave] ❌ Auto-save failed:', error);
        }
      }, debounceMs);
    };

    // BlockNote onChange 이벤트 구독
    const unsubscribe = editor.onChange(handleChange);

    // 클린업
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      unsubscribe();
    };
  }, [editor, noteId, pageId, debounceMs, enabled]);

  // 컴포넌트 언마운트 시 즉시 저장
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 변경사항이 있으면 즉시 저장
      if (editor && noteId && pageId && enabled) {
        const blocks = editor.document;
        saveNoteContentWithSync(noteId, pageId, blocks).catch((error) => {
          console.error('[useBlockNoteAutoSave] ❌ Unmount save failed:', error);
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
