/**
 * 녹음 목록 관리 훅
 * @param noteId - 특정 노트의 녹음만 필터링 (optional, 없으면 전체)
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as transcriptionApi from "@/lib/api/services/transcription.api";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("RecordingList");

interface FormattedRecording {
  id: number;
  title: string;
  time: string;
  date: string;
  duration: string;
  sessionId?: string;
  noteId?: string;
  audioRecordingId?: string; // 타임라인 이벤트 로드용
}

export function useRecordingList(noteId?: string | null) {
  const queryClient = useQueryClient();

  // React Query: 녹음 목록 조회
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ["recordings"],
    queryFn: async () => {
      log.debug("🔄 백엔드에서 녹음 목록 조회 중...");
      const result = await transcriptionApi.getSessions();

      // 최신 녹음 확인 (createdAt 기준 정렬)
      const sorted = [...result].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const newest = sorted[0];
      log.debug("✅ 조회 완료:", result.length, "개 녹음. 최신:",
        newest ? { title: newest.title, noteId: newest.noteId, createdAt: newest.createdAt } : "없음"
      );
      return result;
    },
    staleTime: 0, // 항상 stale 상태로 유지하여 invalidate 시 즉시 refetch
    gcTime: 1000 * 60 * 30, // 30분간 캐시 유지
    refetchOnWindowFocus: true, // 윈도우 포커스 시 refetch
  });

  // noteId가 주어지면 해당 노트의 녹음만 필터링
  const filteredSessions = noteId
    ? sessions.filter((session) => session.noteId === noteId)
    : sessions;

  // 🔥 디버깅 제거 (문제 해결됨)

  // React Query: 녹음 삭제 (Optimistic Update 적용)
  const deleteRecordingMutation = useMutation({
    mutationFn: (sessionId: string) => transcriptionApi.deleteSession(sessionId),

    // Optimistic Update
    onMutate: async (sessionId) => {
      // 이전 쿼리 취소 (race condition 방지)
      await queryClient.cancelQueries({ queryKey: ["recordings"] });

      // 이전 데이터 백업
      const previousRecordings = queryClient.getQueryData<transcriptionApi.TranscriptionSession[]>(["recordings"]);

      // 즉시 UI 업데이트
      queryClient.setQueryData<transcriptionApi.TranscriptionSession[]>(
        ["recordings"],
        (old = []) => old.filter((s) => s.id !== sessionId)
      );

      log.debug("✅ Optimistic update: UI에서 제거됨");

      return { previousRecordings };
    },

    // 실패 시 롤백
    onError: (error, sessionId, context) => {
      if (context?.previousRecordings) {
        queryClient.setQueryData(["recordings"], context.previousRecordings);
        log.error("❌ 롤백: 이전 데이터 복원됨", error);
      }
    },

    // 성공 시 재검증
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
      log.debug("✅ 녹음 삭제 완료");
    },
  });

  // 녹음 목록 포맷팅 (필터링된 세션 사용)
  const formattedRecordings: FormattedRecording[] = filteredSessions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((session) => {
      const date = new Date(session.createdAt);
      const time = date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const dateStr = date
        .toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\. /g, "/")
        .replace(".", "");

      const durationInSeconds = Number(session.duration);
      const mins = Math.floor(durationInSeconds / 60);
      const secs = durationInSeconds % 60;
      const duration = `${mins}:${secs.toString().padStart(2, "0")}`;

      return {
        id: parseInt(session.id, 10) || 0,
        title: session.title,
        time,
        date: dateStr,
        duration,
        sessionId: session.id,
        noteId: session.noteId,
        audioRecordingId: session.audioRecordingId, // 타임라인 이벤트 로드용
      };
    });

  return {
    recordings: formattedRecordings,
    isLoading,
    refetch, // 수동 갱신용

    // 녹음 삭제 (Optimistic Update)
    removeRecording: (sessionId: string) => {
      deleteRecordingMutation.mutate(sessionId);
    },
  };
}
