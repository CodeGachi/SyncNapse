/**
 * Recordings API - Backend와 IndexedDB를 추상화
 */

import type { DBRecording } from "@/lib/db/recordings";
import {
  saveRecording as saveRecordingInDB,
  getRecordingsByNote as getRecordingsByNoteFromDB,
  getRecording as getRecordingFromDB,
  deleteRecording as deleteRecordingInDB,
  renameRecording as renameRecordingInDB,
} from "@/lib/db/recordings";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * 노트의 모든 녹음본 가져오기
 */
export async function fetchRecordingsByNote(
  noteId: string
): Promise<DBRecording[]> {
  if (USE_LOCAL) {
    return await getRecordingsByNoteFromDB(noteId);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}/recordings`);
    if (!res.ok) throw new Error("Failed to fetch recordings");
    return await res.json();
  }
}

/**
 * 녹음본 저장
 */
export async function saveRecording(
  noteId: string,
  name: string,
  recordingBlob: Blob,
  duration: number
): Promise<DBRecording> {
  if (USE_LOCAL) {
    return await saveRecordingInDB(noteId, name, recordingBlob, duration);
  } else {
    // 백엔드 API 호출
    const formData = new FormData();
    formData.append("name", name);
    formData.append("recording", recordingBlob);
    formData.append("duration", duration.toString());

    const res = await fetch(`/api/notes/${noteId}/recordings`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to save recording");
    return await res.json();
  }
}

/**
 * 녹음본 삭제
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  if (USE_LOCAL) {
    await deleteRecordingInDB(recordingId);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/recordings/${recordingId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete recording");
  }
}

/**
 * 녹음본 이름 변경
 */
export async function renameRecording(
  recordingId: string,
  newName: string
): Promise<void> {
  if (USE_LOCAL) {
    await renameRecordingInDB(recordingId, newName);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/recordings/${recordingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) throw new Error("Failed to rename recording");
  }
}
