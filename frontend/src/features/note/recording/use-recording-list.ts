/**
 * 녹음 목록 관리 훅
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as transcriptionApi from "@/lib/api/transcription.api";

interface FormattedRecording {
  id: number;
  title: string;
  time: string;
  date: string;
  duration: string;
  sessionId?: string;
}

export function useRecordingList() {
  const queryClient = useQueryClient();

  // React Query: 녹음 목록 조회
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ["recordings"],
    queryFn: async () => {
      console.log('[useRecordingList] 🔄 Fetching recordings from backend...');
      const result = await transcriptionApi.getSessions();
      console.log('[useRecordingList] ✅ Fetched', result.length, 'recordings');
      return result;
    },
    staleTime: 0, // 항상 stale 상태로 유지하여 invalidate 시 즉시 refetch
    gcTime: 1000 * 60 * 30, // 30분간 캐시 유지
    refetchOnWindowFocus: true, // 윈도우 포커스 시 refetch
  });

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

      console.log('[useRecordingList] ✅ Optimistic update: Removed from UI');

      return { previousRecordings };
    },

    // 실패 시 롤백
    onError: (error, sessionId, context) => {
      if (context?.previousRecordings) {
        queryClient.setQueryData(["recordings"], context.previousRecordings);
        console.error('[useRecordingList] ❌ Rollback: Restored previous data', error);
      }
    },

    // 성공 시 재검증
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
      console.log('[useRecordingList] ✅ Recording deleted successfully');
    },
  });

  // 녹음 목록 포맷팅
  const formattedRecordings: FormattedRecording[] = sessions
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
