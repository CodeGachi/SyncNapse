/**
 * 그리기 히스토리 (Undo/Redo) 관리 훅
 */

import { useCallback, useState } from "react";
import * as fabric from "fabric";
import type { HistoryEntry } from "@/lib/types/drawing";

export function useDrawingHistory(canvas: fabric.Canvas | null) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  /**
   * 현재 상태를 히스토리에 저장
   */
  const pushHistory = useCallback(() => {
    if (!canvas) return;

    setHistory((prev) => {
      // 현재 인덱스 이후의 히스토리 제거 (새로운 분기)
      const newHistory = prev.slice(0, currentIndex + 1);

      // 새 상태 추가
      newHistory.push({
        id: Date.now().toString(),
        json: JSON.stringify(canvas.toJSON()),
        timestamp: Date.now(),
      });

      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [canvas, currentIndex]);

  /**
   * Undo - 이전 상태로 복원
   */
  const undo = useCallback(() => {
    if (!canvas || currentIndex <= 0) return;

    const newIndex = currentIndex - 1;
    const entry = history[newIndex];

    if (entry) {
      canvas.loadFromJSON(JSON.parse(entry.json), () => {
        canvas.renderAll();
        setCurrentIndex(newIndex);
      });
    }
  }, [canvas, history, currentIndex]);

  /**
   * Redo - 다음 상태로 복원
   */
  const redo = useCallback(() => {
    if (!canvas || currentIndex >= history.length - 1) return;

    const newIndex = currentIndex + 1;
    const entry = history[newIndex];

    if (entry) {
      canvas.loadFromJSON(JSON.parse(entry.json), () => {
        canvas.renderAll();
        setCurrentIndex(newIndex);
      });
    }
  }, [canvas, history, currentIndex]);

  /**
   * 히스토리 초기화
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    pushHistory,
    undo,
    redo,
    clearHistory,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    historyLength: history.length,
    currentIndex,
  };
}
