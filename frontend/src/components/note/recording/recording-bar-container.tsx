/**
 * 녹음바 Container 컴포넌트
 * 녹음 로직 + UI를 결합
 */

"use client";

import { useState } from "react";
import {
  useRecordingControl,
  useAudioPlayer,
  useRecordingList,
} from "@/features/note/recording";
import { useRecordingTimeline } from "@/features/note/recording/use-recording-timeline";
import { useNoteEditorStore } from "@/stores";
import { RecordingBar } from "./recording-bar";
import { RecordingNameModal } from "./recording-name-modal";
import { RecordingListDropdown } from "./recording-list-dropdown";

interface RecordingBarContainerProps {
  noteId: string | null;
}

export function RecordingBarContainer({ noteId }: RecordingBarContainerProps) {
  // 녹음 제어 hooks
  const {
    isRecording,
    isPaused,
    recordingTime,
    recordingTimeSeconds,
    audioRecordingId,
    isNameModalOpen,
    handlePlayPause,
    handleStopRecording,
    handleSaveRecording,
    handleCancelSave,
  } = useRecordingControl(noteId);

  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    handleRecordingSelect,
    resetAudioPlayer,
  } = useAudioPlayer();

  // 녹음 목록 (현재 노트의 녹음만 필터링)
  const {
    recordings,
    removeRecording,
  } = useRecordingList(noteId);

  // 현재 페이지/파일 정보 (타임라인 이벤트용) - useNoteEditorStore 사용 (PDF 뷰어와 동일한 store)
  const { currentPage, selectedFileId, files } = useNoteEditorStore();

  // 현재 선택된 파일의 backendId 찾기 (타임라인 이벤트용)
  const currentBackendId = selectedFileId
    ? files.find((f) => f.id === selectedFileId)?.backendId
    : undefined;

  // 녹음 중 페이지 컨텍스트 추적 및 타임라인 이벤트 저장
  useRecordingTimeline({
    isRecording,
    recordingTime: recordingTimeSeconds,
    audioRecordingId,
    currentBackendId,
    currentPage,
  });

  // 녹음 목록 드롭다운 상태
  const [isRecordingListOpen, setIsRecordingListOpen] = useState(false);

  // 버튼 1: 녹음 시작/일시정지/재개 (녹음 전용)
  const onPlayToggle = () => {
    if (isRecording) {
      // 녹음 중: 일시정지/재개
      handlePlayPause(isPlaying, audioRef.current);
    } else {
      // 녹음 시작 - 기존 오디오 플레이어 초기화 후 새 녹음 시작
      console.log('[RecordingBarContainer] Starting new recording');
      resetAudioPlayer();
      handlePlayPause(isPlaying, null);
    }
  };

  // 버튼 3: 녹음본 재생/일시정지 (재생 전용)
  const onStop = () => {
    if (audioRef.current && audioRef.current.src && duration > 0) {
      // 재생 중: 재생/일시정지 토글
      console.log('[RecordingBarContainer] Toggle audio playback, isPlaying:', isPlaying);
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  // 녹음 삭제 핸들러 (React Query가 Optimistic Update 처리)
  const handleDeleteRecording = async (sessionId: string) => {
    try {
      console.log('[RecordingBarContainer] 🗑️ Deleting recording:', sessionId);

      // React Query의 Optimistic Update 사용 (즉시 UI 업데이트 + 자동 롤백)
      removeRecording(sessionId);

      console.log('[RecordingBarContainer] ✅ Deletion complete');
    } catch (error) {
      console.error('[RecordingBarContainer] ❌ Failed to delete recording:', error);
      alert('녹음본 삭제에 실패했습니다.');
    }
  };

  // 녹음 목록 토글
  const handleToggleRecordingList = () => {
    setIsRecordingListOpen(!isRecordingListOpen);
  };

  // 재생 위치 변경 핸들러
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // 저장 핸들러 (녹음 중일 때만)
  const handleSave = () => {
    if (isRecording) {
      console.log('[RecordingBarContainer] Save recording');
      // 녹음을 일시정지하고 저장 모달 열기
      if (!isPaused) {
        handlePlayPause(isPlaying, audioRef.current);
      }
      handleStopRecording();
    }
  };

  // 맨앞으로 가기 핸들러 (재생 모드에서만)
  const handleSkipBack = () => {
    if (audioRef.current && duration > 0) {
      console.log('[RecordingBarContainer] Skip back to beginning');
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <>
      <div className="relative">
        <RecordingBar
          isPlaying={isRecording ? !isPaused : isPlaying}
          time={recordingTime}
          onPlayToggle={onPlayToggle}
          onStop={onStop}
          onSave={handleSave}
          onSkipBack={handleSkipBack}
          isRecording={isRecording}
          onToggleRecordingList={handleToggleRecordingList}
          recordingCount={recordings.length}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
        />

        {/* 녹음 목록 드롭다운 */}
        <RecordingListDropdown
          isOpen={isRecordingListOpen}
          onClose={() => setIsRecordingListOpen(false)}
          recordings={recordings}
          onSelectRecording={(sessionId, audioRecordingId) => {
            if (!isRecording) {
              handleRecordingSelect(sessionId, audioRecordingId);
            } else {
              alert('녹음 중에는 저장된 녹음을 재생할 수 없습니다.');
            }
          }}
          onDeleteRecording={handleDeleteRecording}
        />
      </div>

      {/* 녹음 이름 설정 모달 */}
      <RecordingNameModal
        isOpen={isNameModalOpen}
        duration={recordingTimeSeconds}
        onSave={handleSaveRecording}
        onCancel={handleCancelSave}
      />
    </>
  );
}
