/**
 * PDF.js 페이지와 Liveblocks 실시간 동기화 훅
 *
 * Educator 노트에서 PDF 페이지를 실시간으로 동기화합니다.
 */

"use client";

import { useEffect, useCallback } from "react";
import {
  useStorage,
  useMutation,
  useUpdateMyPresence,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";

interface UseLiveblocksPdfSyncOptions {
  currentPage: number;
  currentFileId: string | null;
  onPageChange: (page: number) => void;
  onFileChange: (fileId: string) => void;
  isEducator: boolean;
}

export function useLiveblocksPdfSync({
  currentPage,
  currentFileId,
  onPageChange,
  onFileChange,
  isEducator,
}: UseLiveblocksPdfSyncOptions) {
  // Liveblocks Storage에서 현재 페이지/파일 조회
  const sharedPage = useStorage((root) => root.currentPage);
  const sharedFileId = useStorage((root) => root.currentFileId);

  const updateMyPresence = useUpdateMyPresence();
  const broadcastEvent = useBroadcastEvent();

  // Educator의 페이지/파일 변경을 Storage에 저장
  const updateSharedPage = useMutation(
    ({ storage }, page: number, fileId: string | null) => {
      storage.set("currentPage", page);
      storage.set("currentFileId", fileId);
    },
    []
  );

  // 1. Educator: 페이지 변경 시 Storage 업데이트
  useEffect(() => {
    if (!isEducator) return;

    updateSharedPage(currentPage, currentFileId);
    updateMyPresence({
      currentPage,
      currentFileId,
    });

    // 페이지 변경 이벤트 브로드캐스트
    broadcastEvent({
      type: "PAGE_CHANGE",
      page: currentPage,
      fileId: currentFileId || "",
    });

    console.log("[Liveblocks PDF] Educator changed page:", currentPage, "file:", currentFileId);
  }, [currentPage, currentFileId, isEducator, updateSharedPage, updateMyPresence, broadcastEvent]);

  // 2. Student: Storage 변경 감지하여 페이지 동기화
  useEffect(() => {
    if (isEducator) return; // Educator는 자신의 페이지를 따름
    if (sharedPage === undefined || sharedPage === null) return;

    // Storage의 페이지가 현재 페이지와 다르면 동기화
    if (sharedPage !== currentPage) {
      console.log("[Liveblocks PDF] Student syncing to page:", sharedPage);
      onPageChange(sharedPage);
    }
  }, [sharedPage, currentPage, isEducator, onPageChange]);

  // 3. Student: Storage의 파일 변경 감지
  useEffect(() => {
    if (isEducator) return;
    if (!sharedFileId) return;

    // Storage의 파일이 현재 파일과 다르면 동기화
    if (sharedFileId !== currentFileId) {
      console.log("[Liveblocks PDF] Student syncing to file:", sharedFileId);
      onFileChange(sharedFileId);
    }
  }, [sharedFileId, currentFileId, isEducator, onFileChange]);

  // 4. 페이지 변경 이벤트 리스너 (실시간 알림용)
  useEventListener(({ event }) => {
    if (event.type === "PAGE_CHANGE") {
      console.log("[Liveblocks PDF] Page change event:", event.page, "file:", event.fileId);
      // 추가 UI 업데이트 (예: 토스트 알림)
    }
  });

  return {
    sharedPage,
    sharedFileId,
    isFollowingEducator: !isEducator,
  };
}
