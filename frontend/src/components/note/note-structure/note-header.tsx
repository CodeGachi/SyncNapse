/**
 * 노트 헤더 - 제목 + 녹음바
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecordingBarContainer } from "@/components/note/recording/recording-bar-container";
import { HeaderMenu } from "@/components/note/note-structure/header-menu";
import { useEducatorUIStore, useRecordingStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface NoteHeaderProps {
  noteId: string | null;
  noteTitle?: string; // optional - fallback으로 사용
  isEducatorNote?: boolean;
  isSharedView?: boolean;
}

export function NoteHeader({
  noteId,
  noteTitle: propTitle,
  isEducatorNote = false,
  isSharedView = false,
}: NoteHeaderProps) {
  const router = useRouter();
  const { openSharingModal } = useEducatorUIStore();

  // 녹음 상태 (전역 store)
  const { isRecording, stopRecordingCallback } = useRecordingStore();

  // 노트 데이터에서 제목 가져오기
  const { data: note } = useNote(noteId, { enabled: !!noteId && !isSharedView });
  const noteTitle = note?.title || propTitle || "제목 없음";

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecordingConfirmOpen, setIsRecordingConfirmOpen] = useState(false);

  const handleHomeClick = () => {
    // 녹음 중이면 확인 모달 표시
    if (isRecording) {
      setIsRecordingConfirmOpen(true);
      return;
    }
    router.push("/dashboard/main");
  };

  // 녹음 저장 후 이동
  const handleSaveAndNavigate = () => {
    setIsRecordingConfirmOpen(false);
    // 녹음 저장 모달 열기
    stopRecordingCallback?.();
  };

  // 녹음 취소하고 이동
  const handleDiscardAndNavigate = () => {
    setIsRecordingConfirmOpen(false);
    router.push("/dashboard/main");
  };

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-background-surface border-b border-border"
      >
        <div className="flex items-center justify-between px-4 py-2 relative">
          {/* 왼쪽: 아이콘 + 제목 영역 */}
          <div className="flex items-center gap-3">
            {/* 홈 아이콘 */}
            <button
              onClick={handleHomeClick}
              className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer hover:bg-background-elevated rounded text-foreground"
              title="대시보드로 이동"
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.8 2.65C11.1462 2.39036 11.5673 2.25 12 2.25C12.4327 2.25 12.8538 2.39036 13.2 2.65L20.2 7.9C20.4484 8.08629 20.65 8.32786 20.7889 8.60557C20.9277 8.88328 21 9.18951 21 9.5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H14.1C13.8083 21 13.5285 20.8841 13.3222 20.6778C13.1159 20.4715 13 20.1917 13 19.9V14C13 13.7348 12.8946 13.4804 12.7071 13.2929C12.5196 13.1054 12.2652 13 12 13C11.7348 13 11.4804 13.1054 11.2929 13.2929C11.1054 13.4804 11 13.7348 11 14V19.9C11 20.0445 10.9715 20.1875 10.9163 20.321C10.861 20.4544 10.78 20.5757 10.6778 20.6778C10.5757 20.78 10.4544 20.861 10.321 20.9163C10.1875 20.9715 10.0445 21 9.9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V9.5C3 9.18951 3.07229 8.88328 3.21115 8.60557C3.35 8.32786 3.55161 8.08629 3.8 7.9L10.8 2.65ZM12 4.25L5 9.5V19H9V14C9 13.2044 9.31607 12.4413 9.87868 11.8787C10.4413 11.3161 11.2044 11 12 11C12.7956 11 13.5587 11.3161 14.1213 11.8787C14.6839 12.4413 15 13.2044 15 14V19H19V9.5L12 4.25Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* 메뉴 아이콘 */}
            <button
              onClick={handleMenuClick}
              className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer hover:bg-background-elevated rounded text-foreground"
              title="메뉴"
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* 제목 */}
            <h1 className="text-[18px] font-bold text-foreground leading-[22px]">
              {noteTitle}
            </h1>

            {/* Share button (Educator notes only, except shared view) */}
            {isEducatorNote && !isSharedView && noteId && (
              <button
                onClick={() => openSharingModal(noteId, noteTitle)}
                className="w-8 h-8 flex items-center justify-center text-foreground-tertiary hover:text-brand hover:bg-background-elevated rounded-lg transition-all cursor-pointer"
                title="공유 설정"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            )}
          </div>

          {/* 오른쪽: 녹음바 */}
          <div className="flex-shrink-0">
            <RecordingBarContainer noteId={noteId} />
          </div>

          {/* 헤더 메뉴 */}
          <HeaderMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            noteId={noteId}
            isSharedView={isSharedView}
            sourceNoteTitle={noteTitle}
          />
        </div>
      </motion.div>

      {/* 녹음 중 페이지 이동 확인 모달 */}
      <AnimatePresence>
        {isRecordingConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setIsRecordingConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-background-elevated border border-border rounded-xl shadow-2xl w-[360px] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-yellow-500" />
                  <h3 className="font-semibold text-foreground">녹음 중</h3>
                </div>
                <button
                  onClick={() => setIsRecordingConfirmOpen(false)}
                  className="text-foreground-tertiary hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 본문 */}
              <div className="px-4 py-4">
                <p className="text-sm text-foreground-secondary">
                  현재 녹음이 진행 중입니다.<br />
                  페이지를 이동하기 전에 녹음을 저장하시겠습니까?
                </p>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 px-4 py-3 border-t border-border bg-background-surface">
                <button
                  onClick={handleDiscardAndNavigate}
                  className="flex-1 px-3 py-2 text-sm font-medium text-foreground-tertiary hover:text-foreground hover:bg-background-overlay rounded-lg transition-colors"
                >
                  저장 안 함
                </button>
                <button
                  onClick={handleSaveAndNavigate}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-brand hover:bg-brand/90 rounded-lg transition-colors"
                >
                  저장
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
