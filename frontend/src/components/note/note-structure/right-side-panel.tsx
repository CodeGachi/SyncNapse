/**
 * 노트 우측 사이드 패널 - Client Component
 * 녹음바, 스크립트, 파일, etc, 태그 패널을 담당
 *
 * Refactored: Business logic separated to features/note/right-panel/
 */

"use client";

import { useState, useEffect } from "react";
import { useNoteEditorStore, usePanelsStore, useScriptTranslationStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useRecordingList } from "@/features/note/player";
import {
  useRecordingControl,
  useAudioPlayer,
  useFileManagement,
  useQuestionManagement,
  useTranscriptTranslation,
} from "@/features/note/right-panel";

// UI Components
import { RecordingBar } from "@/components/note/recording/recording-bar";
import { RecordingNameModal } from "@/components/note/recording/recording-name-modal";
import { CategoryButtons } from "@/components/note/note-structure/category-buttons";
import { ScriptPanel } from "@/components/note/panels/script-panel";
import { TranscriptTimeline } from "@/components/note/panels/transcript-timeline";
import { FilePanel } from "@/components/note/panels/file-panel";
import { EtcPanel } from "@/components/note/panels/etc-panel";
import { TagsPanel } from "@/components/note/panels/tags-panel";
import { CollaborationPanel } from "@/components/note/collaboration/collaboration-panel";

interface RightSidePanelProps {
  noteId: string | null;
  isCollaborating?: boolean;
  isSharedView?: boolean; // 공유 모드 여부
}

export function RightSidePanel({ noteId, isCollaborating = false, isSharedView = false }: RightSidePanelProps) {
  // Get note data to determine if it's an educator note
  // 공유 모드에서는 로컬 DB 쿼리 비활성화
  const { data: note } = useNote(noteId, { enabled: !isSharedView });
  const isEducatorNote = note?.type === "educator" || isSharedView; // 공유 모드면 무조건 educator 노트

  // 사용자 정보 로드 (협업 기능용)
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const storedUserId = localStorage.getItem("userId") || `user-${Date.now()}`;
    const storedUserName = localStorage.getItem("userName") || "사용자";

    // 없으면 새로 생성하여 저장
    if (!localStorage.getItem("userId")) {
      localStorage.setItem("userId", storedUserId);
    }
    if (!localStorage.getItem("userName")) {
      localStorage.setItem("userName", storedUserName);
    }

    setUserId(storedUserId);
    setUserName(storedUserName);

    console.log(`[RightSidePanel] 사용자 정보 로드: ${storedUserName} (${storedUserId})`);
  }, []);

  // Store states (useEffect 전에 먼저 선언)
  const {
    files: uploadedFiles,
    removeFile,
    selectedFileId,
    selectFile,
    openFileInTab,
    renameFile,
    copyFile,
    activeCategories,
    toggleCategory,
    isExpanded,
    toggleExpand,
    currentTime,
  } = useNoteEditorStore();

  const { scriptSegments } = useScriptTranslationStore();

  // Active segment tracking for transcript timeline
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const {
    isNotePanelOpen,
    toggleNotePanel,
    isFilePanelOpen,
    toggleFilePanel,
    isScriptOpen,
    toggleScript,
    isEtcPanelOpen,
    toggleEtcPanel,
    isTagsPanelOpen,
    toggleTagsPanel,
    isCollaborationPanelOpen,
    toggleCollaborationPanel,
  } = usePanelsStore();

  // 공유 모드일 때 자동으로 사이드바 확장 및 협업 패널 열기
  useEffect(() => {
    if (isSharedView && isCollaborating) {
      // 사이드바 자동 확장
      if (!isExpanded) {
        console.log('[RightSidePanel] 공유 모드 - 사이드바 자동 확장');
        toggleExpand();
      }
      // 협업 패널 자동 열기
      if (!isCollaborationPanelOpen) {
        console.log('[RightSidePanel] 공유 모드 - 협업 패널 자동 열기');
        toggleCollaborationPanel();
      }
    }
  }, [isSharedView, isCollaborating, isExpanded, isCollaborationPanelOpen, toggleExpand, toggleCollaborationPanel]);

  // Recording list
  const {
    recordings: formattedRecordings,
    isExpanded: isRecordingExpanded,
    toggleExpanded: toggleRecordingExpanded,
    refreshRecordings,
    removeFromBackendList,
  } = useRecordingList();

  // Custom hooks for business logic
  const {
    isRecording,
    isPaused,
    recordingTime,
    recordingTimeSeconds,
    isNameModalOpen,
    isSavingRecording,
    handlePlayPause,
    handleStopRecording,
    handleSaveRecording,
    handleCancelSave,
  } = useRecordingControl(noteId);

  const {
    audioRef,
    isPlaying,
    togglePlay,
    handleRecordingSelect: handleRecordingSelectOriginal,
    handleStopPlayback,
  } = useAudioPlayer();

  // ✅ noteId 전달하여 IndexedDB에 저장되도록 수정
  const { handleAddFile } = useFileManagement({ noteId });

  const { handleAddQuestion, deleteQuestion } = useQuestionManagement({ noteId });

  const { isTranslating, translationSupported } = useTranscriptTranslation();

  // Wrap handleRecordingSelect to stop recording first
  const handleRecordingSelect = (sessionId: string) => {
    // 녹음 중일 때는 먼저 녹음을 멈춤
    if (isRecording) {
      console.log('[RightSidePanel] Stopping recording before playing saved audio');
      alert('녹음을 먼저 종료해주세요.');
      return;
    }
    
    // 녹음 중이 아니면 정상적으로 재생
    handleRecordingSelectOriginal(sessionId);
  };
  
  // Handle recording deletion
  const handleDeleteRecording = async (sessionId: string) => {
    try {
      console.log('[RightSidePanel] 🗑️ Deleting recording:', sessionId);
      
      // 1. Immediately remove from UI (optimistic update)
      const { removeRecording } = useNoteEditorStore.getState();
      removeRecording(sessionId);
      removeFromBackendList(sessionId);
      console.log('[RightSidePanel] ✅ Removed from UI immediately (optimistic)');
      
      // Import deleteSession dynamically
      const { deleteSession } = await import('@/lib/api/transcription.api');
      const { deleteSession: deleteLocalSession } = await import('@/lib/storage/transcription-storage');
      
      // 2. Delete from backend (soft delete with deletedAt)
      try {
        await deleteSession(sessionId);
        console.log('[RightSidePanel] ✅ Recording deleted from backend (PostgreSQL)');
      } catch (backendError: any) {
        // If 404, it's already deleted - that's okay
        if (backendError?.status === 404) {
          console.log('[RightSidePanel] ⚠️ Recording already deleted from backend (404)');
        } else {
          // Rollback on error - refresh to restore UI
          await refreshRecordings();
          throw backendError;
        }
      }
      
      // 3. Delete from local IndexedDB
      try {
        await deleteLocalSession(sessionId);
        console.log('[RightSidePanel] ✅ Recording deleted from IndexedDB');
      } catch (localError) {
        console.warn('[RightSidePanel] ⚠️ Failed to delete from IndexedDB:', localError);
        // Continue even if local delete fails
      }
      
      // 4. Confirm with backend (verify deletion)
      await refreshRecordings();
      console.log('[RightSidePanel] ✅ Deletion confirmed with backend');
      
    } catch (error) {
      console.error('[RightSidePanel] ❌ Failed to delete recording:', error);
      alert('녹음 삭제에 실패했습니다.');
    }
  };

  // User info (for question authorship)
  const currentUser = { name: "사용자", email: "user@example.com" };

  // Track active transcript segment based on audio playback time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || scriptSegments.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime; // in seconds
      
      // Find the active segment - segment.timestamp is in milliseconds
      const activeSegment = scriptSegments.find(
        (segment) => {
          const segmentStartTime = (segment.timestamp || 0) / 1000; // Convert ms to seconds
          const segmentEndTime = segmentStartTime + 5; // 5 second window
          return currentTime >= segmentStartTime && currentTime < segmentEndTime;
        }
      );
      
      if (activeSegment) {
        console.log('[RightSidePanel] Active segment:', {
          id: activeSegment.id,
          text: activeSegment.originalText?.substring(0, 30),
          segmentTime: ((activeSegment.timestamp || 0) / 1000).toFixed(2) + 's',
          currentTime: currentTime.toFixed(2) + 's',
        });
      }
      
      setActiveSegmentId(activeSegment?.id || null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef, scriptSegments]);

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
        console.log('[RightSidePanel] Stopping audio playback before recording');
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        if (isPlaying) togglePlay(); // Update isPlaying state
      }
      
      // 녹음 시작
      handlePlayPause(isPlaying, audioRef.current);
    }
  };

  // Audio playback controls (for saved recordings)
  const handleAudioPlayToggle = () => {
    // 녹음 중에는 저장된 오디오 재생 불가
    if (isRecording) {
      console.log('[RightSidePanel] Cannot play saved audio while recording');
      return;
    }
    
    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      togglePlay();
    }
  };

  const handleAudioStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (isPlaying) togglePlay();
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

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle timeline seek
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      // Validate time value
      if (!isFinite(time) || time < 0) {
        console.warn('[RightSidePanel] Invalid seek time:', time);
        return;
      }
      
      // Clamp time to valid range
      const maxTime = audioRef.current.duration || 0;
      const validTime = Math.max(0, Math.min(time, maxTime));
      
      audioRef.current.currentTime = validTime;
      console.log('[RightSidePanel] Seek to:', validTime);
    }
  };

  return (
    <>
      {/* 녹음바 - 항상 오른쪽 상단에 표시 */}
      <div className="fixed right-4 top-4 z-50">
        <RecordingBar
          isPlaying={isRecording && !isPaused}
          time={recordingTime}
          onPlayToggle={onPlayToggle}
          onStop={onStop}
          isExpanded={isRecordingExpanded}
          onToggleExpand={toggleRecordingExpanded}
          recordings={formattedRecordings}
          isScriptOpen={isScriptOpen}
          onToggleScript={toggleScript}
          isRecording={isRecording}
          onRecordingSelect={handleRecordingSelect}
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

      {/* 사이드 패널 - 확장시에만 표시 */}
      <div
        className={`fixed right-0 top-0 h-full flex flex-col gap-2 pt-6 px-4 bg-[#1e1e1e] transition-all duration-300 ${
          isExpanded ? "translate-x-0 w-[500px]" : "translate-x-full w-0"
        }`}
        style={{ zIndex: 20 }}
      >
        {isExpanded && (
          <>

          {/* 스크립트 패널 */}
          <ScriptPanel 
            isOpen={isScriptOpen} 
            onClose={toggleScript} 
            audioRef={audioRef}
            activeSegmentId={activeSegmentId}
            isTranslating={isTranslating}
            translationSupported={translationSupported}
            isRecording={isRecording}
          />

          {/* 타임라인 (스크립트가 열려있고 세그먼트가 있을 때만 표시) */}
          {isScriptOpen && scriptSegments.length > 0 && (
            <>
              <TranscriptTimeline
                segments={scriptSegments}
                audioRef={audioRef}
                activeSegmentId={activeSegmentId}
                onSeek={handleSeek}
                className="mt-3"
              />
              
              {/* 오디오 재생 컨트롤 */}
              {audioRef.current && audioRef.current.src && !isRecording && (
                <div className="mt-3 bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 재생/일시정지 버튼 */}
                      <button
                        onClick={handleAudioPlayToggle}
                        className="w-10 h-10 bg-[#444444] rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        {isPlaying ? (
                          <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                            <rect x="0" y="0" width="4" height="14" />
                            <rect x="8" y="0" width="4" height="14" />
                          </svg>
                        ) : (
                          <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                            <path d="M0 0L12 7L0 14V0Z" />
                          </svg>
                        )}
                      </button>

                      {/* 정지 버튼 */}
                      <button
                        onClick={handleAudioStop}
                        className="w-10 h-10 bg-[#444444] rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                          <rect width="10" height="10" />
                        </svg>
                      </button>

                      {/* 시간 표시 */}
                      <div className="text-white text-sm">
                        {formatTime(currentTime)} / {formatTime(audioRef.current.duration || 0)}
                      </div>
                    </div>

                    <div className="text-gray-400 text-xs">
                      오디오 재생 중
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 파일 패널 */}
          <FilePanel
            isOpen={isFilePanelOpen}
            files={uploadedFiles}
            onAddFile={handleAddFile}
            onRemoveFile={removeFile}
            selectedFileId={selectedFileId}
            onSelectFile={selectFile}
            onOpenFileInTab={openFileInTab}
            onRenameFile={renameFile}
            onCopyFile={copyFile}
          />

          {/* etc 패널 */}
          <EtcPanel isOpen={isEtcPanelOpen} />

          {/* tags 패널 */}
          <TagsPanel isOpen={isTagsPanelOpen} />

          {/* 협업 패널 (교육자 노트 + 협업 모드 활성화 시, Liveblocks 실시간) */}
          {isCollaborationPanelOpen && isEducatorNote && isCollaborating && userId && userName && (
            <CollaborationPanel
              userId={userId}
              userName={userName}
              noteId={noteId || ""}
              isEducator={!isSharedView} // 공유 모드에서는 학생
            />
          )}

          {/* 카테고리 버튼 */}
          <CategoryButtons
            activeCategories={activeCategories}
            onCategoryToggle={toggleCategory}
            onNotesToggle={toggleNotePanel}
            isNotesOpen={isNotePanelOpen}
            onFilesToggle={toggleFilePanel}
            isFilesOpen={isFilePanelOpen}
            onEtcToggle={toggleEtcPanel}
            isEtcOpen={isEtcPanelOpen}
            onTagsToggle={toggleTagsPanel}
            isTagsOpen={isTagsPanelOpen}
            onCollaborationToggle={toggleCollaborationPanel}
            isCollaborationOpen={isCollaborationPanelOpen}
            isEducator={isEducatorNote}
          />
        </>
      )}
    </div>
    </>
  );
}
