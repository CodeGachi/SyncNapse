/**
 * 자동저장 훅
 * 디바운스를 적용하여 변경사항을 자동으로 저장
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useNoteEditorStore } from "@/stores";

interface UseAutoSaveOptions {
  noteId: string;
  debounceMs?: number;
  onSave: () => Promise<void>;
  enabled?: boolean;
}

export function useAutoSave({
  noteId,
  debounceMs = 30000, // 30초로 변경
  onSave,
  enabled = true,
}: UseAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { blocks, updateLastSavedAt } = useNoteEditorStore();

  const performSave = useCallback(async () => {
    if (!enabled) return;

    try {
      await onSave();
      updateLastSavedAt();
      // 성공 알림은 표시하지 않음 (너무 빈번)
    } catch (error) {
      console.error("자동저장 실패:", error);
      // 알림 제거됨 - console.error로 대체
    }
  }, [enabled, onSave, updateLastSavedAt]);

  // blocks가 변경될 때마다 디바운스 적용하여 저장
  useEffect(() => {
    if (!enabled || !noteId) return;

    // 이전 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 새 타이머 설정
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // 클린업
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [blocks, noteId, debounceMs, enabled, performSave]);

  // 컴포넌트 언마운트 시 즉시 저장
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // 변경사항이 있으면 즉시 저장
      performSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    forceSave: performSave,
  };
}
