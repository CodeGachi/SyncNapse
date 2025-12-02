/**
 * 노트 헤더 - 제목 + 녹음바
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecordingBarContainer } from "@/components/note/recording/recording-bar-container";
import { HeaderMenu } from "@/components/note/note-structure/header-menu";
import { useEducatorUIStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import Image from "next/image";

import { motion } from "framer-motion";

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

  // 노트 데이터에서 제목 가져오기
  const { data: note } = useNote(noteId, { enabled: !!noteId && !isSharedView });
  const noteTitle = note?.title || propTitle || "제목 없음";

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleHomeClick = () => {
    router.push("/dashboard/main");
  };

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
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
            className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer hover:bg-background-elevated rounded"
            title="대시보드로 이동"
          >
            <Image src="/home.svg" alt="Home" width={22} height={22} />
          </button>

          {/* 메뉴 아이콘 */}
          <button
            onClick={handleMenuClick}
            className="w-8 h-8 flex items-center justify-center transition-colors cursor-pointer hover:bg-background-elevated rounded"
            title="메뉴"
          >
            <Image src="/menu.svg" alt="Menu" width={22} height={22} />
          </button>

          {/* 제목 */}
          <h1 className="text-[18px] font-bold text-foreground leading-[22px]">
            {noteTitle}
          </h1>

          {/* 강의 노트 버튼들 (Educator만, 공유 모드 제외) */}
          {isEducatorNote && !isSharedView && (
            <button
              onClick={() => openSharingModal(noteId || "", noteTitle)}
              className="w-6 h-6 flex items-center justify-center text-foreground-tertiary hover:text-brand transition-colors cursor-pointer"
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
          )}
        </div>

        {/* 오른쪽: 녹음바 */}
        <div className="flex-shrink-0">
          <RecordingBarContainer noteId={noteId} />
        </div>

        {/* 헤더 메뉴 */}
        <HeaderMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} noteId={noteId} />
      </div>
    </motion.div>
  );
}
