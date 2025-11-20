/**
 * 우측 사이드 패널 (통합) - Student & Educator
 * 스크립트, 파일, etc 패널 + 협업 패널(Educator 전용)
 *
 * Refactored: Business logic separated to features/note/right-panel/
 */

"use client";

import { useState, useEffect } from "react";
import { useNoteEditorStore, usePanelsStore, useScriptTranslationStore, useNoteUIStore } from "@/stores";
import {
  useFileManagement,
  useQuestionManagement,
  useTranscriptTranslation,
} from "@/features/note/right-panel";
import { useAudioPlayer } from "@/features/note/recording";

// UI Components
import { ScriptPanel } from "@/components/note/panels/script-panel";
import { TranscriptTimeline } from "@/components/note/panels/transcript-timeline";
import { FilePanel } from "@/components/note/panels/file-panel";
import { EtcPanel } from "@/components/note/panels/etc-panel";
import { CollaborationPanel } from "@/components/note/collaboration/collaboration-panel";

interface RightSidePanelProps {
  noteId: string | null;
  isEducator?: boolean; // 교육자 노트 여부
}

export function RightSidePanel({ noteId, isEducator = false }: RightSidePanelProps) {
  // Educator 전용: 사용자 정보 로드 (협업 기능용)
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!isEducator) return; // Student는 건너뜀

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
  }, [isEducator]);

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
    currentTime,
  } = useNoteEditorStore();

  const { scriptSegments } = useScriptTranslationStore();

  // UI Store
  const { isExpanded, toggleExpand } = useNoteUIStore();

  // Active segment tracking for transcript timeline
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const {
    isFilePanelOpen,
    toggleFilePanel,
    isScriptOpen,
    toggleScript,
    isEtcPanelOpen,
    toggleEtcPanel,
    isCollaborationPanelOpen,
    toggleCollaborationPanel,
  } = usePanelsStore();

  // 모든 개별 패널이 닫히면 500px 패널도 자동으로 닫기
  useEffect(() => {
    const allPanelsClosed = isEducator
      ? !isScriptOpen && !isFilePanelOpen && !isEtcPanelOpen && !isCollaborationPanelOpen
      : !isScriptOpen && !isFilePanelOpen && !isEtcPanelOpen;

    if (allPanelsClosed && isExpanded) {
      console.log('[RightSidePanel] 모든 패널 닫힘 - 500px 패널 자동 닫기');
      toggleExpand();
    }
  }, [isScriptOpen, isFilePanelOpen, isEtcPanelOpen, isCollaborationPanelOpen, isExpanded, toggleExpand, isEducator]);

  // Audio player for playback (used by ScriptPanel)
  const {
    audioRef,
    isPlaying,
    togglePlay,
  } = useAudioPlayer();

  // ✅ noteId 전달하여 IndexedDB에 저장되도록 수정
  const { handleAddFile } = useFileManagement({ noteId });

  const { handleAddQuestion, deleteQuestion } = useQuestionManagement({ noteId });

  const { isTranslating, translationSupported } = useTranscriptTranslation();

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

  // Audio playback controls (for saved recordings)
  const handleAudioPlayToggle = () => {
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
      {/* 사이드 패널 - 확장시에만 표시 */}
      <div
        className={`flex flex-col bg-[#1e1e1e] overflow-hidden ${
          isExpanded ? "flex-shrink-0 w-[370px] gap-2 pt-6 px-3" : "w-0 p-0"
        }`}
      >
        {isExpanded && (
          <>

          {/* 스크립트 패널 */}
          <ScriptPanel
            noteId={noteId}
            isOpen={isScriptOpen}
            onClose={toggleScript}
            audioRef={audioRef}
            activeSegmentId={activeSegmentId}
            isTranslating={isTranslating}
            translationSupported={translationSupported}
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
              {audioRef.current && audioRef.current.src && (
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
            onClose={toggleFilePanel}
          />

          {/* etc 패널 */}
          <EtcPanel isOpen={isEtcPanelOpen} onClose={toggleEtcPanel} />

          {/* 협업 패널 (Educator 전용, Liveblocks 실시간) */}
          {isEducator && isCollaborationPanelOpen && userId && userName && (
            <CollaborationPanel
              userId={userId}
              userName={userName}
              noteId={noteId!}
              isEducator={true}
            />
          )}
        </>
      )}
    </div>
    </>
  );
}
