/**
 * 녹음 중 페이지 컨텍스트 추적 및 타임라인 이벤트 저장
 * 페이지/파일 변경 시 자동으로 타임라인 이벤트를 백엔드에 저장
 *
 * backendId (fileId) 사용:
 * - 백엔드 File 테이블의 ID를 직접 사용하여 안정적인 파일 식별
 * - 파일 순서 변경/삭제에도 올바르게 동작
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import * as audioApi from "@/lib/api/audio.api";

interface UseRecordingTimelineProps {
  isRecording: boolean;
  recordingTime: number; // 현재 녹음 시간 (초)
  audioRecordingId: string | null; // AudioRecording ID
  currentBackendId?: string; // 현재 선택된 파일의 백엔드 ID
  currentPage: number; // 현재 페이지 번호
}

/**
 * 녹음 중 페이지/파일 변경을 감지하고 타임라인 이벤트를 저장하는 훅
 */
export function useRecordingTimeline({
  isRecording,
  recordingTime,
  audioRecordingId,
  currentBackendId,
  currentPage,
}: UseRecordingTimelineProps) {
  // 이전 상태 추적
  const prevBackendIdRef = useRef<string | undefined>(undefined);
  const prevPageRef = useRef<number>(1);
  const isInitialEventSavedRef = useRef(false);

  // 저장 중이거나 저장 완료된 timestamp Set
  const savedTimestampsRef = useRef<Set<number>>(new Set());

  // 타임라인 이벤트 저장 (동기적 중복 체크)
  // backendId (fileId)와 pageNumber를 직접 저장
  const saveTimelineEvent = useCallback(
    async (timestamp: number, backendId: string | undefined, pageNumber: number) => {
      if (!audioRecordingId) {
        return;
      }

      // 정수 timestamp로 변환 (백엔드가 같은 초에 하나만 허용)
      const intTimestamp = Math.floor(timestamp);

      // 동기적으로 즉시 체크 & 등록 (React Strict Mode 대응)
      if (savedTimestampsRef.current.has(intTimestamp)) {
        return; // 이미 저장 중이거나 저장됨
      }
      savedTimestampsRef.current.add(intTimestamp);

      try {
        await audioApi.addTimelineEvent(audioRecordingId, {
          timestamp: intTimestamp,
          fileId: backendId, // 백엔드 File ID 직접 사용
          pageNumber: pageNumber,
        });
        console.log("[useRecordingTimeline] ✅ Timeline event saved:", {
          timestamp: intTimestamp + "s",
          fileId: backendId || "(none)",
          pageNumber,
        });
      } catch (error: unknown) {
        const apiError = error as { status?: number };
        if (apiError?.status !== 409) {
          console.error("[useRecordingTimeline] Failed to save timeline event:", error);
          savedTimestampsRef.current.delete(intTimestamp);
        }
      }
    },
    [audioRecordingId]
  );

  // 통합된 useEffect: 초기 이벤트 저장 + 페이지/파일 변경 감지
  useEffect(() => {
    // 녹음 종료 시 초기화
    if (!isRecording) {
      if (isInitialEventSavedRef.current) {
        console.log("[useRecordingTimeline] Recording stopped - resetting state");
        isInitialEventSavedRef.current = false;
        prevBackendIdRef.current = undefined;
        prevPageRef.current = 1;
        savedTimestampsRef.current.clear();
      }
      return;
    }

    // 녹음 중이 아니거나 필수 값이 없으면 무시
    if (!audioRecordingId) {
      return;
    }

    // 초기 이벤트 저장 (한 번만)
    if (!isInitialEventSavedRef.current) {
      console.log("[useRecordingTimeline] 🎯 Saving initial timeline event...");
      saveTimelineEvent(0, currentBackendId, currentPage);
      isInitialEventSavedRef.current = true;
      prevBackendIdRef.current = currentBackendId;
      prevPageRef.current = currentPage;
      return; // 초기 저장 후 바로 리턴 (페이지 변경 감지는 다음 렌더에서)
    }

    // 페이지/파일 변경 감지
    const fileChanged = currentBackendId !== prevBackendIdRef.current;
    const pageChanged = currentPage !== prevPageRef.current;

    if (fileChanged || pageChanged) {
      console.log("[useRecordingTimeline] Context changed:", {
        fileChanged,
        pageChanged,
        from: { fileId: prevBackendIdRef.current, page: prevPageRef.current },
        to: { fileId: currentBackendId, page: currentPage },
        recordingTime: recordingTime + "s",
      });

      saveTimelineEvent(recordingTime, currentBackendId, currentPage);
      prevBackendIdRef.current = currentBackendId;
      prevPageRef.current = currentPage;
    }
  }, [isRecording, audioRecordingId, currentBackendId, currentPage, recordingTime, saveTimelineEvent]);

  return {
    // 수동으로 타임라인 이벤트 저장 (필요 시)
    saveTimelineEvent,
  };
}
