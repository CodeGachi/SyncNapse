/**
 * 노트 헤더 - Client Component
 * 제목 + 녹음바를 포함하는 상단 고정 헤더
 */

"use client";

import { useState } from "react";
import { useNote } from "@/lib/api/queries/notes.queries";
import { RecordingBar } from "@/components/note/recording/recording-bar";
import { AutoSaveBadge } from "@/components/note/text-notes/auto-save-badge";
import { SharingSettingsModal } from "@/components/note/shared/sharing-settings-modal";
import { useNoteEditorStore } from "@/stores";

interface NoteHeaderProps {
  noteId: string | null;
  noteTitle: string;
  isSharedView?: boolean;
  isCollaborating?: boolean;
  onStartCollaboration?: () => void;
  onStopCollaboration?: () => void;
  autoSaveStatus?: "idle" | "saving" | "saved" | "error";
  lastSavedAt?: Date | null;
  // 녹음바 props
  isRecording?: boolean;
  isPaused?: boolean;
  recordingTime?: string;
  onPlayToggle?: () => void;
  onStopRecording?: () => void;
  isScriptOpen?: boolean;
  onToggleScript?: () => void;
  // 공유 설정 props (educator만)
  sharingSettings?: any;
  newUserEmail?: string;
  onNewUserEmailChange?: (email: string) => void;
  onAddUser?: () => void;
  onRemoveUser?: (email: string) => void;
  onTogglePublic?: () => void;
  onToggleComments?: () => void;
  onToggleRealTimeInteraction?: () => void;
  onCopyShareLink?: () => void;
}

export function NoteHeader({
  noteId,
  noteTitle,
  isSharedView = false,
  isCollaborating = false,
  onStartCollaboration,
  onStopCollaboration,
  autoSaveStatus = "idle",
  lastSavedAt = null,
  isRecording = false,
  isPaused = false,
  recordingTime = "00:00",
  onPlayToggle = () => {},
  onStopRecording,
  isScriptOpen = false,
  onToggleScript,
  sharingSettings,
  newUserEmail = "",
  onNewUserEmailChange = () => {},
  onAddUser = () => {},
  onRemoveUser = () => {},
  onTogglePublic = () => {},
  onToggleComments = () => {},
  onToggleRealTimeInteraction = () => {},
  onCopyShareLink = () => {},
}: NoteHeaderProps) {
  const { data: note } = useNote(noteId, { enabled: !isSharedView });
  const actualTitle = note?.title || noteTitle;
  const isEducatorNote = note?.type === "educator";

  const { isExpanded, toggleExpand } = useNoteEditorStore();
  const [isSharingOpen, setIsSharingOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#1e1e1e] border-b border-[#2f2f2f]">
      <div className="flex items-center justify-between px-6 py-4">
        {/* 왼쪽: 제목 영역 */}
        <div className="flex items-center gap-4">
          <h1 className="text-[32px] font-bold text-white leading-[39px]">
            {actualTitle}
          </h1>

          {/* 자동저장 배지 */}
          <AutoSaveBadge status={autoSaveStatus} lastSavedAt={lastSavedAt} />

          {/* 강의 노트 버튼들 (Educator만, 공유 모드 제외) */}
          {isEducatorNote && !isSharedView && sharingSettings && (
            <div className="flex items-center gap-2">
              {/* 공유 설정 버튼 */}
              <button
                onClick={() => setIsSharingOpen(!isSharingOpen)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#AFC02B] transition-colors cursor-pointer"
                title="공유 설정"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>

              {/* 공유 설정 모달 */}
              <SharingSettingsModal
                isOpen={isSharingOpen}
                onClose={() => setIsSharingOpen(false)}
                settings={sharingSettings}
                newUserEmail={newUserEmail}
                onNewUserEmailChange={onNewUserEmailChange}
                onAddUser={onAddUser}
                onRemoveUser={onRemoveUser}
                onTogglePublic={onTogglePublic}
                onToggleComments={onToggleComments}
                onToggleRealTimeInteraction={onToggleRealTimeInteraction}
                onCopyShareLink={onCopyShareLink}
                shareLink={sharingSettings.shareLink}
                noteId={noteId || ""}
                noteTitle={actualTitle}
                isCollaborating={isCollaborating}
                onStartCollaboration={onStartCollaboration ?? (() => {})}
                onStopCollaboration={onStopCollaboration ?? (() => {})}
              />
            </div>
          )}

          {/* 공유 모드 뱃지 */}
          {isSharedView && (
            <div className="px-3 py-1 bg-[#AFC02B]/20 text-[#AFC02B] rounded-full text-sm font-medium">
              공유 노트 보기
            </div>
          )}
        </div>

        {/* 오른쪽: 녹음바 */}
        <div className="flex-shrink-0">
          <RecordingBar
            isPlaying={isRecording && !isPaused}
            time={recordingTime}
            onPlayToggle={onPlayToggle}
            onStop={onStopRecording}
            isScriptOpen={isScriptOpen}
            onToggleScript={onToggleScript}
            isRecording={isRecording}
          />
        </div>
      </div>
    </div>
  );
}
