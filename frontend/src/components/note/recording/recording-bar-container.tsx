/**
 * 녹음바 Container 컴포넌트
 * 녹음 로직 + UI를 결합
 */

"use client";

import { useState } from "react";
import { useRecordingControl, useAudioPlayer } from "@/features/note/right-panel";
import { useRecordingList } from "@/features/note/player";
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
    isNameModalOpen,
    handlePlayPause,
    handleStopRecording,
    handleSaveRecording,
    handleCancelSave,
  } = useRecordingControl(noteId);

  const {
    audioRef,
    isPlaying,
    togglePlay,
    handleRecordingSelect,
  } = useAudioPlayer();

  // 녹음 목록
  const {
    recordings,
    refreshRecordings,
    removeFromBackendList,
  } = useRecordingList();

  // 녹음 목록 드롭다운 상태
  const [isRecordingListOpen, setIsRecordingListOpen] = useState(false);

  // Recording control - ONLY for starting/pausing/resuming recording
  const onPlayToggle = () => {
    if (isRecording) {
      // 녹음 중: 일시정지/재개
      if (isPaused) {
        handlePlayPause(isPlaying, audioRef.current); // Resume recording
      } else {
        handlePlayPause(isPlaying, audioRef.current); // Pause recording
      }
    } else {
      // 녹음 시작 전: 현재 재생 중인 오디오를 멈춤
      if (audioRef.current && audioRef.current.src && isPlaying) {
        console.log('[RecordingBarContainer] Stopping audio playback before recording');
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (isPlaying) togglePlay(); // Update isPlaying state
      }

      // 녹음 시작
      handlePlayPause(isPlaying, audioRef.current);
    }
  };

  // Stop handler - Stops recording immediately and opens save modal
  const onStop = () => {
    if (isRecording) {
      // 녹음을 즉시 멈추고 모달 열기
      // pauseRecording을 호출하여 녹음을 멈춤 (모달에서 저장/취소 선택)
      if (!isPaused) {
        handlePlayPause(isPlaying, audioRef.current); // Pause recording first
      }
      handleStopRecording();
    }
    // 재생 중에는 RecordingBar의 stop 버튼이 작동하지 않음
    // 재생 종료는 timeline 아래 플레이어에서 처리
  };

  // 녹음 삭제 핸들러
  const handleDeleteRecording = async (sessionId: string) => {
    try {
      console.log('[RecordingBarContainer] 🗑️ Deleting recording:', sessionId);

      // 1. Immediately remove from UI (optimistic update)
      const { removeRecording } = useNoteEditorStore.getState();
      removeRecording(sessionId);
      removeFromBackendList(sessionId);
      console.log('[RecordingBarContainer] ✅ Removed from UI immediately (optimistic)');

      // Import deleteSession dynamically
      const { deleteSession } = await import('@/lib/api/transcription.api');
      const { deleteSession: deleteLocalSession } = await import('@/lib/storage/transcription-storage');

      // 2. Delete from backend (soft delete with deletedAt)
      try {
        await deleteSession(sessionId);
        console.log('[RecordingBarContainer] ✅ Recording deleted from backend (PostgreSQL)');
      } catch (backendError: any) {
        // If 404, it's already deleted - that's okay
        if (backendError?.status === 404) {
          console.log('[RecordingBarContainer] ⚠️ Recording already deleted from backend (404)');
        } else {
          // Rollback on error - refresh to restore UI
          await refreshRecordings();
          throw backendError;
        }
      }

      // 3. Delete from local IndexedDB
      try {
        await deleteLocalSession(sessionId);
        console.log('[RecordingBarContainer] ✅ Recording deleted from IndexedDB');
      } catch (localError) {
        console.warn('[RecordingBarContainer] ⚠️ Failed to delete from IndexedDB:', localError);
        // Continue even if local delete fails
      }

      // 4. Confirm with backend (verify deletion)
      await refreshRecordings();
      console.log('[RecordingBarContainer] ✅ Deletion confirmed with backend');

    } catch (error) {
      console.error('[RecordingBarContainer] ❌ Failed to delete recording:', error);
      alert('녹음 삭제에 실패했습니다.');
    }
  };

  // 녹음 목록 토글
  const handleToggleRecordingList = () => {
    setIsRecordingListOpen(!isRecordingListOpen);
  };

  return (
    <>
      <div className="relative">
        <RecordingBar
          isPlaying={isRecording && !isPaused}
          time={recordingTime}
          onPlayToggle={onPlayToggle}
          onStop={onStop}
          isRecording={isRecording}
          onToggleRecordingList={handleToggleRecordingList}
          recordingCount={recordings.length}
        />

        {/* 녹음 목록 드롭다운 */}
        <RecordingListDropdown
          isOpen={isRecordingListOpen}
          onClose={() => setIsRecordingListOpen(false)}
          recordings={recordings}
          onSelectRecording={(sessionId) => {
            if (!isRecording) {
              handleRecordingSelect(sessionId);
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
