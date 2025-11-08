/**
 * Educator 노트 헤더
 *
 * 개인 편집 모드: 공유 버튼만 표시
 * 협업 모드: 공유 버튼 + 접속자 정보 표시
 */

"use client";

import { Suspense } from "react";
import { ShareLinkButton } from "@/components/note/sharing/share-link-button";
import { EducatorHeaderContent } from "./educator-header-content";

interface EducatorHeaderProps {
  noteId: string;
  noteTitle: string;
  isCollaborating: boolean;
  onStartCollaboration: () => void;
  onStopCollaboration: () => void;
}

export function EducatorHeader({
  noteId,
  noteTitle,
  isCollaborating,
  onStartCollaboration,
  onStopCollaboration,
}: EducatorHeaderProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4">
      {/* 접속자 정보 (협업 모드일 때만, Liveblocks Provider 내부에서만 렌더링) */}
      {isCollaborating && (
        <Suspense fallback={<div className="text-white">로딩 중...</div>}>
          <EducatorHeaderContent />
        </Suspense>
      )}

      {/* 공유 버튼 */}
      <ShareLinkButton
        noteId={noteId}
        noteTitle={noteTitle}
        isCollaborating={isCollaborating}
        onStartCollaboration={onStartCollaboration}
        onStopCollaboration={onStopCollaboration}
      />
    </div>
  );
}
