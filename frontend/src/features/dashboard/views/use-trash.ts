/**
 * 휴지통 페이지 훅
 * trash-content.tsx에서 분리된 비즈니스 로직
 */

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchTrashedNotes, restoreNote, permanentlyDeleteNote } from "@/lib/api/services/notes.api";
import { createLogger } from "@/lib/utils/logger";
import type { Note } from "@/lib/types";

const log = createLogger("TrashContent");

export function useTrash() {
  const queryClient = useQueryClient();
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // 삭제된 노트 목록 로드
  const loadTrashedNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      log.debug("삭제된 노트 로딩 중...");
      const notes = await fetchTrashedNotes();
      log.debug("로드 완료:", notes.length, "개 노트");
      setTrashedNotes(notes);
    } catch (error) {
      log.error("휴지통 로드 실패:", error);
      alert('휴지통 로드에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrashedNotes();
  }, [loadTrashedNotes]);

  // 노트 복구 핸들러
  const handleRestore = useCallback(async (noteId: string, noteTitle: string) => {
    if (restoring || deleting) return; // 중복 클릭 방지

    const confirmed = confirm(`"${noteTitle}" 노트를 복구하시겠습니까?\n타임스탬프가 포함된 이름으로 복구됩니다.`);
    if (!confirmed) return;

    try {
      setRestoring(noteId);
      log.debug("노트 복구 중:", noteId);

      const result = await restoreNote(noteId);
      log.debug("복구 결과:", result);

      alert(`복구되었습니다!\n새 이름: ${result.title || noteTitle}`);

      // 쿼리 무효화로 모든 노트 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });

      // 삭제된 노트 목록 새로고침
      await loadTrashedNotes();
    } catch (error) {
      log.error("노트 복구 실패:", error);
      alert('복구에 실패했습니다.');
    } finally {
      setRestoring(null);
    }
  }, [restoring, deleting, queryClient, loadTrashedNotes]);

  // 영구 삭제 핸들러
  const handlePermanentDelete = useCallback(async (noteId: string, noteTitle: string) => {
    if (restoring || deleting) return; // 중복 클릭 방지

    const confirmed = confirm(
      `⚠️ 경고: "${noteTitle}" 노트를 영구적으로 삭제하시겠습니까?\n\n` +
      `이 작업은 되돌릴 수 없으며, 다음 항목들이 모두 삭제됩니다:\n` +
      `- 노트 콘텐츠\n` +
      `- 첨부 파일\n` +
      `- 관련 데이터\n\n` +
      `정말로 삭제하시겠습니까?`
    );

    if (!confirmed) return;

    // 안전을 위한 이중 확인
    const doubleConfirmed = confirm(
      `정말로 "${noteTitle}"를 영구 삭제하시겠습니까?\n이 작업은 취소할 수 없습니다!`
    );

    if (!doubleConfirmed) return;

    try {
      setDeleting(noteId);
      log.debug("노트 영구 삭제 중:", noteId);

      await permanentlyDeleteNote(noteId);
      log.debug("영구 삭제 완료");

      alert('영구적으로 삭제되었습니다.');

      // 쿼리 무효화로 모든 노트 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });

      // 삭제된 노트 목록 새로고침
      await loadTrashedNotes();
    } catch (error) {
      log.error("영구 삭제 실패:", error);
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleting(null);
    }
  }, [restoring, deleting, queryClient, loadTrashedNotes]);

  // 날짜 포맷팅
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '알 수 없음';
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // 상대 시간 포맷팅 (예: 2일 전)
  const formatRelativeTime = useCallback((dateString?: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}일 전`;
    } else if (diffHours > 0) {
      return `${diffHours}시간 전`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}분 전`;
    } else {
      return '방금 전';
    }
  }, []);

  return {
    // 상태
    trashedNotes,
    isLoading,
    restoring,
    deleting,

    // 핸들러
    handleRestore,
    handlePermanentDelete,

    // 유틸리티
    formatDate,
    formatRelativeTime,
  };
}
