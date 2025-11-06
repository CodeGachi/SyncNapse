/**
 * Recording Control Hook
 * Manages recording state and operations
 */

"use client";

import { useState, useCallback } from "react";
import { useNoteEditorStore } from "@/stores";
import { useRecording, type RecordingData } from "@/features/note/player";

export function useRecordingControl() {
  const { addRecording } = useNoteEditorStore();

  const {
    isRecording,
    isPaused,
    formattedTime: recordingTime,
    error: recordingError,
    startRecording: startBasicRecording,
    pauseRecording,
    resumeRecording,
    stopRecording: stopBasicRecording,
    cancelRecording,
  } = useRecording();

  // Recording name modal state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [pendingRecordingData, setPendingRecordingData] = useState<RecordingData | null>(null);

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

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    return await stopBasicRecording();
  }, [stopBasicRecording]);

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

  // 녹음 종료 (모달 열기)
  const handleStopRecording = async () => {
    if (isRecording) {
      try {
        const recordingData = await stopRecording();
        setPendingRecordingData(recordingData);
        setIsNameModalOpen(true);
      } catch (error) {
        console.error("녹음 종료 실패:", error);
        alert("녹음 저장에 실패했습니다");
      }
    }
  };

  // 녹음 저장 (이름과 함께)
  const handleSaveRecording = (title: string) => {
    if (!pendingRecordingData) return;

    addRecording({
      title,
      duration: pendingRecordingData.duration,
      createdAt: pendingRecordingData.createdAt,
      audioBlob: pendingRecordingData.audioBlob,
    });

    setIsNameModalOpen(false);
    setPendingRecordingData(null);
  };

  // 녹음 저장 취소
  const handleCancelSave = () => {
    setIsNameModalOpen(false);
    setPendingRecordingData(null);
  };

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordingError,
    isNameModalOpen,
    pendingRecordingData,
    handlePlayPause,
    handleStopRecording,
    handleSaveRecording,
    handleCancelSave,
  };
}
