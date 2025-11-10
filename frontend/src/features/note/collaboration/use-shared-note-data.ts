/**
 * 공유 모드에서 Liveblocks Storage로부터 노트 데이터를 로드하는 Custom Hook
 *
 * 공유 링크로 접속한 학생들이 Liveblocks Storage에 저장된 노트 데이터를 읽어옵니다.
 */

"use client";

import { useEffect } from "react";
import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { useNoteEditorStore } from "@/stores";

interface UseSharedNoteDataProps {
  isSharedView: boolean;
  noteId: string;
}

export function useSharedNoteData({
  isSharedView,
  noteId,
}: UseSharedNoteDataProps) {
  // Liveblocks Storage에서 데이터 읽기
  const noteInfo = useStorage((root) => root.noteInfo);
  const files = useStorage((root) => root.files);
  const pageNotes = useStorage((root) => root.pageNotes);
  const currentPage = useStorage((root) => root.currentPage);
  const currentFileId = useStorage((root) => root.currentFileId);

  const {
    setFiles,
    setSelectedFileId,
    setCurrentPage,
    setPageNotes,
  } = useNoteEditorStore();

  // 공유 모드일 때 Liveblocks Storage의 데이터를 로컬 store에 동기화
  useEffect(() => {
    if (!isSharedView || !noteInfo) {
      console.log("[공유 모드] 대기 중:", { isSharedView, hasNoteInfo: !!noteInfo });
      return;
    }

    console.log("[공유 모드] Liveblocks Storage에서 노트 데이터 로드 중...");
    console.log("[공유 모드] noteInfo:", noteInfo);
    console.log("[공유 모드] files 수:", files?.length || 0);

    // 파일 목록 동기화
    if (files && files.length > 0) {
      const fileData = files.map((file) => ({
        id: file.id,
        name: file.fileName,
        type: file.fileType,
        size: file.fileSize,
        url: file.fileUrl,
        uploadedAt: new Date(file.uploadedAt).toISOString(),
      }));

      setFiles(fileData);
      console.log(`[공유 모드] 파일 ${fileData.length}개 로드 완료`);
    }

    // 현재 파일 및 페이지 동기화
    if (currentFileId) {
      setSelectedFileId(currentFileId);
      console.log(`[공유 모드] 현재 파일 ID: ${currentFileId}`);
    }

    if (currentPage) {
      setCurrentPage(currentPage);
      console.log(`[공유 모드] 현재 페이지: ${currentPage}`);
    }

    // 필기 데이터 동기화
    if (pageNotes && Object.keys(pageNotes).length > 0) {
      const notesData: Record<string, any[]> = {};

      Object.entries(pageNotes).forEach(([key, blocks]) => {
        notesData[key] = blocks.map((block) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          checked: block.checked,
          order: block.order,
          createdAt: block.createdAt,
        }));
      });

      setPageNotes(notesData);
      console.log(`[공유 모드] 필기 ${Object.keys(notesData).length}개 페이지 로드 완료`);
    }

    console.log("[공유 모드] 노트 데이터 로드 완료:", noteInfo.title);
  }, [
    isSharedView,
    noteInfo,
    files,
    pageNotes,
    currentFileId,
    currentPage,
    setFiles,
    setSelectedFileId,
    setCurrentPage,
    setPageNotes,
  ]);

  return {
    noteInfo,
    files,
    pageNotes,
    currentPage,
    currentFileId,
    // Liveblocks 연결 대기: noteInfo가 undefined면 아직 로딩 중
    // noteInfo가 null이면 연결은 됐지만 데이터가 없는 상태 (빈 노트)
    isLoading: isSharedView && noteInfo === undefined,
  };
}
