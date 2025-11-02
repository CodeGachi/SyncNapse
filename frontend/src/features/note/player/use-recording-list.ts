/**
 * 녹음 목록 관리 훅 (Store 연동)
 */

"use client";

import { useNoteEditorStore } from "@/stores";

export function useRecordingList() {
  const {
    isRecordingExpanded,
    toggleRecordingExpanded,
    recordings,
    selectRecording,
    removeRecording,
  } = useNoteEditorStore();

  // Recording 타입을 RecordingBar가 기대하는 형식으로 변환
  const formattedRecordings = recordings.map((recording) => {
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
    };
  });

  return {
    isExpanded: isRecordingExpanded,
    recordings: formattedRecordings,
    toggleExpanded: toggleRecordingExpanded,
    selectRecording,
    removeRecording,
  };
}