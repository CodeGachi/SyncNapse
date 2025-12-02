/**
 * 학생 노트 컨텐츠 컴포넌트
 *
 * 학생 노트 페이지의 메인 컨텐츠
 */

"use client";

import { useEffect } from "react";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteHeader } from "@/components/note/note-structure/note-header";
import { usePanelsStore, useAudioPlayerStore } from "@/stores";
import { createLogger } from "@/lib/utils/logger";
import { motion } from "framer-motion";

const log = createLogger("StudentNote");

interface StudentNoteContentProps {
  noteId: string;
  noteTitle: string;
  seekTime: number | null;
}

export function StudentNoteContent({
  noteId,
  noteTitle,
  seekTime,
}: StudentNoteContentProps) {
  // 패널 상태 초기화
  const resetPanels = usePanelsStore((state) => state.reset);
  const setPendingSeekTime = useAudioPlayerStore((state) => state.setPendingSeekTime);

  useEffect(() => {
    resetPanels();
  }, [resetPanels]);

  // URL에서 시간 파라미터가 있으면 스토어에 저장
  useEffect(() => {
    if (seekTime !== null && !isNaN(seekTime)) {
      log.debug("시간 파라미터 설정:", seekTime);
      setPendingSeekTime(seekTime);
    }
  }, [seekTime, setPendingSeekTime]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex items-start bg-background-surface h-screen w-full"
    >
      {/* 헤더 - 제목 + 녹음바 */}
      <NoteHeader
        noteId={noteId}
        noteTitle={noteTitle}
        isEducatorNote={false}
      />

      {/* 데이터 로더 - 파일 목록 로드 + 노트 검증 */}
      <NoteDataLoader noteId={noteId}>
        {/* 메인 레이아웃 - 뷰어 + 패널 + 아이콘 */}
        <main className="flex-1 h-full">
          <div className="flex gap-1 h-full pt-16 md:pt-20 px-1 md:px-2 pb-2 md:pb-4">
            {/* 메인 컨텐츠 영역 - PDF 뷰어 + BlockNote 에디터 */}
            <NoteContentArea noteId={noteId} noteTitle={noteTitle} />

            {/* 우측 사이드 패널 - 스크립트, 파일 등 */}
            <RightSidePanel noteId={noteId} isEducator={false} />

            {/* 우측 사이드바 아이콘 - 패널 닫혔을 때 */}
            <SidebarIcons noteId={noteId} isEducator={false} />
          </div>
        </main>
      </NoteDataLoader>
    </motion.div>
  );
}
