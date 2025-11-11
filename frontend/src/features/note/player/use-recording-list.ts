/**
 * 녹음 목록 관리 훅 (Backend API 연동)
 */

"use client";

import { useState, useEffect } from "react";
import { useNoteEditorStore } from "@/stores";
import * as transcriptionApi from "@/lib/api/transcription.api";

export function useRecordingList() {
  const {
    isRecordingExpanded,
    toggleRecordingExpanded,
    recordings: storeRecordings,
    selectRecording,
    removeRecording,
    addRecording,
  } = useNoteEditorStore();

  const [backendSessions, setBackendSessions] = useState<transcriptionApi.TranscriptionSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recordings from backend on mount
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        setIsLoading(true);
        console.log('[useRecordingList] Loading recordings from backend...');
        
        const sessions = await transcriptionApi.getSessions();
        setBackendSessions(sessions);
        
        console.log('[useRecordingList] Loaded', sessions.length, 'recordings from backend');
      } catch (error) {
        console.error('[useRecordingList] Failed to load recordings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecordings();
  }, []);

  // Merge store recordings and backend sessions
  // Store recordings are temporary (just recorded), backend sessions are persisted
  const allRecordings = [
    ...storeRecordings.map((rec) => ({
      id: rec.id,
      title: rec.title,
      duration: rec.duration,
      createdAt: rec.createdAt,
      sessionId: rec.sessionId,
    })),
    ...backendSessions.map((session) => ({
      id: session.id,
      title: session.title,
      duration: Number(session.duration),
      createdAt: session.createdAt,
      sessionId: session.id,
    })),
  ];

  // Remove duplicates by sessionId
  const uniqueRecordings = Array.from(
    new Map(allRecordings.map((rec) => [rec.sessionId || rec.id, rec])).values()
  );

  // Recording 타입을 RecordingBar가 기대하는 형식으로 변환
  const formattedRecordings = uniqueRecordings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((recording) => {
      const date = new Date(recording.createdAt);
      const time = date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const dateStr = date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).replace(/\. /g, "/").replace(".", "");

      const mins = Math.floor(recording.duration / 60);
      const secs = recording.duration % 60;
      const duration = `${mins}:${secs.toString().padStart(2, "0")}`;

      return {
        id: parseInt(recording.id, 10) || 0,
        title: recording.title,
        time,
        date: dateStr,
        duration,
        sessionId: recording.sessionId,
      };
    });

  return {
    isExpanded: isRecordingExpanded,
    recordings: formattedRecordings,
    isLoading,
    toggleExpanded: toggleRecordingExpanded,
    selectRecording,
    removeRecording,
    addRecording,
    refreshRecordings: async () => {
      try {
        const sessions = await transcriptionApi.getSessions();
        setBackendSessions(sessions);
      } catch (error) {
        console.error('[useRecordingList] Failed to refresh recordings:', error);
      }
    },
  };
}