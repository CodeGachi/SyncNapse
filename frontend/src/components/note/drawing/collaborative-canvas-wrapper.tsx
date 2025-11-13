/**
 * Collaborative Canvas Wrapper
 *
 * PDFDrawingOverlay의 협업 동기화 기능을 별도 컴포넌트로 분리
 * RoomProvider 내부에서만 렌더링되도록 조건부로 사용
 */

"use client";

import { useEffect } from "react";
import { useCollaborativeCanvasSync } from "./collaborative-canvas-sync";
import type * as fabric from "fabric";

interface CollaborativeCanvasWrapperProps {
  fabricCanvas: fabric.Canvas | null;
  fileId: string;
  pageNum: number;
  syncToStorageRef?: React.MutableRefObject<((canvas: fabric.Canvas) => void) | null>;
}

export function CollaborativeCanvasWrapper({
  fabricCanvas,
  fileId,
  pageNum,
  syncToStorageRef,
}: CollaborativeCanvasWrapperProps) {
  const { syncToStorage } = useCollaborativeCanvasSync({
    fileId,
    pageNum,
    fabricCanvas,
    isEnabled: true, // 이 컴포넌트가 렌더링되면 항상 활성화
  });

  // syncToStorage를 부모 ref에 저장
  useEffect(() => {
    if (syncToStorageRef) {
      syncToStorageRef.current = syncToStorage;
    }
    return () => {
      if (syncToStorageRef) {
        syncToStorageRef.current = null;
      }
    };
  }, [syncToStorage, syncToStorageRef]);

  // 이 컴포넌트는 렌더링하지 않음 (로직만 실행)
  return null;
}
