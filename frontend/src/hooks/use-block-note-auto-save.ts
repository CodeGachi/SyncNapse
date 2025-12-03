/**
 * BlockNote 자동저장 훅
 * BlockNote 에디터에서 직접 IndexedDB로 저장, Zustand 제거
 */

"use client";

import { useEffect, useRef } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("BlockNoteAutoSave");
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
      log.debug('에디터 콘텐츠 변경됨');

      // 이전 타이머 취소
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 디바운스
      timeoutRef.current = setTimeout(async () => {
        try {
          const blocks = editor.document;
          log.debug('IndexedDB에 저장 중:', {
            noteId,
            pageId,
            blocksCount: blocks.length,
          });

          // IndexedDB에 저장 + 백그라운드 동기화 큐에 추가
          await saveNoteContentWithSync(noteId, pageId, blocks);

          log.debug('✅ 자동저장 완료');
        } catch (error) {
          log.error('❌ 자동저장 실패:', error);
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
          log.error('❌ Unmount 저장 실패:', error);
        });
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
