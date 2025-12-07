/**
 * Collaborative Canvas Wrapper
 *
 * PDFDrawingOverlay의 협업 동기화 기능을 별도 컴포넌트로 분리
 * RoomProvider 내부에서만 렌더링되도록 조건부로 사용
 *
 * Phase 1 개선: 연결 상태 표시 및 에러 알림 UI 추가
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useCollaborativeCanvasSync } from "@/features/note/collaboration/use-collaborative-canvas-sync";
import { createLogger } from "@/lib/utils/logger";
import type * as fabric from "fabric";

const log = createLogger("CollaborativeCanvasWrapper");

interface CollaborativeCanvasWrapperProps {
  fabricCanvas: fabric.Canvas | null;
  noteId: string;  // ⭐ v2: IndexedDB 저장에 필요
  fileId: string;
  pageNum: number;
  syncToStorageRef?: React.MutableRefObject<((canvas: fabric.Canvas) => void) | null>;
  showStatusIndicator?: boolean; // 상태 표시 UI 활성화 여부
  readOnly?: boolean;            // 읽기 전용 모드 (학생용)
  /** ⭐ v2: 원격 업데이트 수신 콜백 */
  onRemoteUpdate?: () => void;
}

export function CollaborativeCanvasWrapper({
  fabricCanvas,
  noteId,
  fileId,
  pageNum,
  syncToStorageRef,
  showStatusIndicator = true,
  readOnly = false,
  onRemoteUpdate,
}: CollaborativeCanvasWrapperProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "warning" | "success">("error");

  // 토스트 표시 헬퍼
  const showToastMessage = useCallback((message: string, type: "error" | "warning" | "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }, []);

  // 에러 콜백
  const handleSyncError = useCallback((error: Error) => {
    log.error("동기화 에러:", error);
    showToastMessage(`동기화 실패: ${error.message}`, "error");
  }, [showToastMessage]);

  // 연결 상태 변경 콜백
  const handleConnectionChange = useCallback((status: string) => {
    if (status === "connected") {
      showToastMessage("연결됨", "success");
    } else if (status === "connecting" || status === "reconnecting") {
      showToastMessage("연결 중...", "warning");
    } else if (status === "disconnected") {
      showToastMessage("연결 끊김 - 오프라인 모드", "warning");
    }
  }, [showToastMessage]);

  const {
    syncToStorage,
    retryPendingChanges,
    error,
    hasPendingChanges,
    connectionStatus,
    isSyncing,
  } = useCollaborativeCanvasSync({
    noteId,  // ⭐ v2: IndexedDB 저장에 필요
    fileId,
    pageNum,
    fabricCanvas,
    isEnabled: true,
    readOnly,
    onSyncError: handleSyncError,
    onConnectionChange: handleConnectionChange,
    onRemoteUpdate,  // ⭐ v2: 원격 업데이트 콜백
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

  // 토스트 자동 숨김
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // 상태 표시 UI (showStatusIndicator가 true일 때만)
  if (!showStatusIndicator) {
    return null;
  }

  return (
    <>
      {/* 연결 상태 인디케이터 */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
        {/* 동기화 상태 표시 */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 rounded-lg px-3 py-1.5 shadow-md text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500"
                : connectionStatus === "connecting" || connectionStatus === "reconnecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-red-500"
            }`}
          />
          <span className="text-gray-700 dark:text-gray-300">
            {connectionStatus === "connected"
              ? isSyncing
                ? "동기화 중..."
                : "실시간 동기화"
              : connectionStatus === "connecting"
              ? "연결 중..."
              : connectionStatus === "reconnecting"
              ? "재연결 중..."
              : "오프라인"}
          </span>
        </div>

        {/* Pending 변경사항 있을 때 재시도 버튼 (readOnly 모드에서는 숨김) */}
        {!readOnly && hasPendingChanges && connectionStatus === "connected" && (
          <button
            onClick={retryPendingChanges}
            className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 rounded-lg px-3 py-1.5 shadow-md text-xs hover:bg-yellow-200 dark:hover:bg-yellow-900 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            저장되지 않은 변경사항 동기화
          </button>
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-lg px-3 py-1.5 shadow-md text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error.message}
          </div>
        )}
      </div>

      {/* 토스트 알림 */}
      {showToast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ${
            toastType === "error"
              ? "bg-red-500 text-white"
              : toastType === "warning"
              ? "bg-yellow-500 text-white"
              : "bg-green-500 text-white"
          }`}
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
