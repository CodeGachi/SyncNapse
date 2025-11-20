/**
 * Recording Control Hook
 * Manages recording state and operations
 */

"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRecording, type RecordingData } from "./use-recording";

export function useRecordingControl(noteId?: string | null) {
  const queryClient = useQueryClient();

  const {
    isRecording,
    isPaused,
    recordingTime: recordingTimeSeconds, // Raw seconds
    recordingStartTime, // Recording start timestamp
    formattedTime: recordingTime,
    error: recordingError,
    startRecording: startBasicRecording,
    pauseRecording,
    resumeRecording,
    stopRecording: stopBasicRecording,
    cancelRecording,
  } = useRecording(noteId);

  // Recording name modal state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      await startBasicRecording();
    } catch (error) {
      console.error('[RecordingControl] Failed to start recording:', error);
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
        console.log('[RecordingControl] Generated default title:', finalTitle);
      }
      
      console.log('[RecordingControl] Saving recording with title:', finalTitle);
      
      // 이제 제목과 함께 stopRecording 호출
      const recordingData = await stopBasicRecording(finalTitle);
      
      console.log('[RecordingControl] Recording saved:', recordingData);

      // React Query 캐시 무효화하여 녹음 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
      console.log('[RecordingControl] ✅ Invalidated recordings cache');

      setIsNameModalOpen(false);
    } catch (error) {
      console.error('[RecordingControl] Failed to save recording:', error);
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
    console.log('[RecordingControl] Recording cancelled and discarded');
  };

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordingTimeSeconds,
    recordingError,
    isNameModalOpen,
    isSavingRecording,
    handlePlayPause,
    handleStopRecording,
    handleSaveRecording,
    handleCancelSave,
  };
}
