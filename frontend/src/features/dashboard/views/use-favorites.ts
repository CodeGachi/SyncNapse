/**
 * 즐겨찾기 페이지 훅
 * favorites-content.tsx에서 분리된 비즈니스 로직
 */

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { updateNote } from "@/lib/api/services/notes.api";
import { useFolders } from "@/features/dashboard";
import { logger } from "@/lib/utils/logger";
import type { Note } from "@/lib/types";

/** 시간 계산 상수 */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function useFavorites() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // 모든 노트 조회
  const { data: allNotes = [], isLoading } = useNotes();
  const { folders } = useFolders();

  // 노트 업데이트 뮤테이션
  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: Partial<Note> }) =>
      updateNote(noteId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  // 즐겨찾기 노트만 필터링
  const favoriteNotes = useMemo(() => {
    return allNotes.filter((note) => note.is_favorite);
  }, [allNotes]);

  // 검색 필터링
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return favoriteNotes;

    const query = searchQuery.toLowerCase();
    return favoriteNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query)
    );
  }, [favoriteNotes, searchQuery]);

  // 폴더 이름 가져오기
  const getFolderName = useCallback((folderId: string | null) => {
    if (!folderId) return "루트";
    const folder = folders.find((f) => f.id === folderId);
    return folder?.name || "알 수 없음";
  }, [folders]);

  // 날짜 포맷팅
  const formatDate = useCallback((dateString: string | number) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / MS_PER_DAY);

    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  // 노트 클릭 핸들러
  const handleNoteClick = useCallback((note: Note) => {
    const noteType = note.type || "student";
    router.push(`/note/${noteType}/${note.id}`);
  }, [router]);

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = useCallback(async (
    e: React.MouseEvent,
    note: Note
  ) => {
    e.stopPropagation();

    try {
      await updateNoteMutation.mutateAsync({
        noteId: note.id,
        updates: {
          is_favorite: !note.is_favorite,
        },
      });
    } catch (error) {
      logger.error("즐겨찾기 토글 실패:", error);
    }
  }, [updateNoteMutation]);

  return {
    // 상태
    searchQuery,
    setSearchQuery,
    isLoading,

    // 데이터
    filteredNotes,

    // 핸들러
    handleNoteClick,
    handleToggleFavorite,

    // 유틸리티
    getFolderName,
    formatDate,
  };
}
