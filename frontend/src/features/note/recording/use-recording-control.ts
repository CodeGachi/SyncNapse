/**
 * 녹음 제어 훅
 * 녹음 상태 및 작업 관리
 */

"use client";

import { useState, useCallback } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("RecordingControl");
import { useQueryClient } from "@tanstack/react-query";
import { useRecording } from "./use-recording";
import type { TranscriptionSession } from "@/lib/api/transcription.api";

export function useRecordingControl(noteId?: string | null) {
  const queryClient = useQueryClient();

  const {
    isRecording,
    isPaused,
    recordingTime: recordingTimeSeconds, // Raw seconds
    recordingStartTime, // Recording start timestamp
    formattedTime: recordingTime,
    error: recordingError,
    audioRecordingId, // AudioRecording ID for timeline
    startRecording: startBasicRecording,
    pauseRecording,
    resumeRecording,
    stopRecording: stopBasicRecording,
    cancelRecording,
  } = useRecording(noteId);

  // 녹음 이름 모달 상태
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);

  /**
   * 녹음 시작
   */
  const startRecording = useCallback(async () => {
    try {
      await startBasicRecording();
    } catch (error) {
      log.error("녹음 시작 실패:", error);
    }
  }, [startBasicRecording]);

  // 녹음 재생/일시정지 토글
  const handlePlayPause = (isPlaying: boolean, audioRef: HTMLAudioElement | null) => {
    if (isRecording) {
      // 녹음 중이면 일시정지/재개
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else if (audioRef && audioRef.src && isPlaying) {
      // 녹음본이 있고 재생 중이면 일시정지
      audioRef.pause();
    } else if (audioRef && audioRef.src && !isPlaying) {
      // 녹음본이 있고 재생 중이 아니면 재생
      audioRef.play();
    } else {
      // 녹음본이 없으면 녹음 시작
      startRecording();
    }
  };

  // 녹음 종료 버튼 클릭 (모달 먼저 열기)
  const handleStopRecording = () => {
    if (isRecording) {
      // 녹음 중이면 모달 열기 (아직 stopRecording 호출 안함!)
      setIsNameModalOpen(true);
    }
  };

  // 녹음 저장 (제목 입력 후 실제로 stopRecording 호출)
  const handleSaveRecording = async (title: string) => {
    if (!isRecording) return;

    try {
      setIsSavingRecording(true);
      
      // 제목이 비어있으면 타임스탬프 기반 제목 생성
      let finalTitle = title.trim();
      if (!finalTitle && recordingStartTime) {
        // Format: YYYY_MM_DD_HH:MM:SS (with leading zeros)
        const year = recordingStartTime.getFullYear();
        const month = String(recordingStartTime.getMonth() + 1).padStart(2, '0');
        const day = String(recordingStartTime.getDate()).padStart(2, '0');
        const hours = String(recordingStartTime.getHours()).padStart(2, '0');
        const minutes = String(recordingStartTime.getMinutes()).padStart(2, '0');
        const seconds = String(recordingStartTime.getSeconds()).padStart(2, '0');
        
        finalTitle = `${year}_${month}_${day}_${hours}:${minutes}:${seconds}`;
        log.debug("기본 제목 생성:", finalTitle);
      }

      log.debug("제목으로 녹음 저장:", finalTitle);

      // 이제 제목과 함께 stopRecording 호출
      const recordingData = await stopBasicRecording(finalTitle);

      log.debug("녹음 저장됨:", recordingData);

      // 🔥 Optimistic Update: 백엔드 응답 기다리지 않고 즉시 UI 업데이트
      if (recordingData.sessionId) {
        const newSession: TranscriptionSession = {
          id: recordingData.sessionId,
          userId: '',
          title: finalTitle,
          noteId: noteId || undefined,
          audioRecordingId: recordingData.audioRecordingId,
          duration: recordingData.duration,
          status: 'completed',
          createdAt: recordingData.createdAt.toISOString(),
          updatedAt: recordingData.createdAt.toISOString(),
        };

        // 캐시에 즉시 추가 (UI 즉시 업데이트)
        queryClient.setQueryData<TranscriptionSession[]>(
          ["recordings"],
          (old = []) => [newSession, ...old]
        );
        log.debug("✅ Optimistic update: 캐시에 즉시 추가됨");

        // 🔥 즉시 백엔드와 동기화 (지연 제거)
        queryClient.invalidateQueries({ queryKey: ["recordings"] });
        log.debug("🔄 즉시 동기화를 위해 recordings 캐시 무효화");
      }

      log.debug("✅ Optimistic update로 녹음 저장됨");

      setIsNameModalOpen(false);
    } catch (error) {
      log.error("녹음 저장 실패:", error);
      alert("녹음 저장에 실패했습니다");
    } finally {
      setIsSavingRecording(false);
    }
  };

  // 녹음 저장 취소 (녹음 완전히 폐기)
  const handleCancelSave = () => {
    // 녹음 완전히 취소: MediaRecorder 중지, 스트림 해제, 메모리 정리
    cancelRecording();
    setIsNameModalOpen(false);
    log.debug("녹음 취소됨 및 폐기됨");
  };

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordingTimeSeconds,
    recordingError,
    audioRecordingId, // AudioRecording ID for timeline
    isNameModalOpen,
    isSavingRecording,
    handlePlayPause,
    handleStopRecording,
    handleSaveRecording,
    handleCancelSave,
  };
}
