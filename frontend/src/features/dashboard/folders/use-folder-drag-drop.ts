/**
 * 폴더/노트 드래그앤드롭 훅
 * 폴더 트리에서 아이템 이동 로직 관리
 */
import { useState, useCallback } from "react";
import type { DragEvent } from "react";
import { moveFolder } from "@/lib/api/services/folders.api";
import { updateNote } from "@/lib/api/services/notes.api";
import { logger } from "@/lib/utils/logger";

type DragItemType = "folder" | "note";

interface DragItem {
  type: DragItemType;
  id: string;
}

interface UseFolderDragDropReturn {
  draggedItem: DragItem | null;
  dragOverItem: DragItem | null;
  handleDragStart: (e: DragEvent, type: DragItemType, id: string) => void;
  handleDragOver: (e: DragEvent, type: DragItemType, id: string) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDrop: (e: DragEvent, targetType: DragItemType, targetId: string) => Promise<void>;
}

/**
 * 폴더/노트 드래그앤드롭 훅
 */
export function useFolderDragDrop(): UseFolderDragDropReturn {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverItem, setDragOverItem] = useState<DragItem | null>(null);

  const handleDragStart = useCallback(
    (e: DragEvent, type: DragItemType, id: string) => {
      e.stopPropagation();
      setDraggedItem({ type, id });
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback(
    (e: DragEvent, type: DragItemType, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedItem && !(draggedItem.type === type && draggedItem.id === id)) {
        setDragOverItem({ type, id });
      }
    },
    [draggedItem]
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent, targetType: DragItemType, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        !draggedItem ||
        (draggedItem.type === targetType && draggedItem.id === targetId)
      ) {
        setDraggedItem(null);
        setDragOverItem(null);
        return;
      }

      // 폴더에만 드롭 허용
      if (targetType === "folder") {
        try {
          if (draggedItem.type === "folder") {
            // 폴더 이동 (하위 폴더 포함)
            await moveFolder(draggedItem.id, targetId);
          } else {
            // 노트를 폴더로 이동
            await updateNote(draggedItem.id, { folderId: targetId });
          }

          // 커스텀 이벤트로 데이터 갱신 알림
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("folders-updated"));
            window.dispatchEvent(new CustomEvent("notes-synced"));
          }

          // 백엔드 동기화 후 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 300);
        } catch (error) {
          logger.error("아이템 이동 실패:", error);
          alert("이동에 실패했습니다. 다시 시도해주세요.");
        }
      }

      setDraggedItem(null);
      setDragOverItem(null);
    },
    [draggedItem]
  );

  return {
    draggedItem,
    dragOverItem,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
