/**
 * Recordings API V2 - 즉시 백엔드 업로드 + IndexedDB 메타데이터 저장
 *
 * 녹음 파일은 용량이 크므로 즉시 백엔드로 업로드하고
 * IndexedDB에는 메타데이터만 저장 (backendUrl 포함)
 */

import type { DBRecording } from "@/lib/db/recordings";
import {
  saveRecording as saveRecordingInDB,
  getRecordingsByNote as getRecordingsByNoteFromDB,
  getRecording as getRecordingFromDB,
  deleteRecording as deleteRecordingInDB,
  renameRecording as renameRecordingInDB,
} from "@/lib/db/recordings";
import { getAccessToken } from "@/lib/auth/token-manager";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Fetch all recordings for a note
 * - IndexedDB에서 즉시 반환
 * - 백엔드 동기화는 백그라운드에서 처리
 */
export async function fetchRecordingsByNote(
  noteId: string
): Promise<DBRecording[]> {
  return await getRecordingsByNoteFromDB(noteId);
}

/**
 * Save recording
 * - 즉시 백엔드에 업로드 (용량이 크므로)
 * - 성공 시 IndexedDB에 메타데이터 저장
 */
export async function saveRecording(
  noteId: string,
  name: string,
  recordingBlob: Blob,
  duration: number
): Promise<DBRecording> {
  const token = getAccessToken();

  // 1. 즉시 백엔드에 업로드
  const formData = new FormData();
  formData.append("recording", recordingBlob, `${name}.webm`);
  formData.append("name", name);
  formData.append("duration", String(duration));

  const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/recordings`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`녹음 업로드 실패: ${response.status} - ${errorText}`);
  }

  const uploadResult = await response.json();

  // 2. IndexedDB에 메타데이터 저장 (Blob 데이터 없이)
  const dbRecording = await saveRecordingInDB(
    noteId,
    name,
    recordingBlob, // 오프라인 재생을 위해 로컬에도 저장
    duration
  );

  // 백엔드 ID와 URL 정보 업데이트 가능하도록 확장 필요 시 여기서 처리
  console.log(`[Recording] ✅ Uploaded to backend: ${uploadResult.id}`);

  return dbRecording;
}

/**
 * Delete recording
 * - 즉시 백엔드에서 삭제
 * - IndexedDB에서도 삭제
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  const token = getAccessToken();

  // 1. 백엔드에서 삭제 시도
  try {
    const response = await fetch(`${API_BASE_URL}/api/recordings/${recordingId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });

    if (!response.ok && response.status !== 404) {
      console.warn(`[Recording] Backend delete failed: ${response.status}`);
    }
  } catch (error) {
    console.warn("[Recording] Backend delete error:", error);
  }

  // 2. IndexedDB에서 삭제
  await deleteRecordingInDB(recordingId);
}

/**
 * Rename recording
 * - 즉시 백엔드 업데이트
 * - IndexedDB에서도 업데이트
 */
export async function renameRecording(
  recordingId: string,
  newName: string
): Promise<void> {
  const token = getAccessToken();

  // 1. 백엔드 업데이트 시도
  try {
    const response = await fetch(`${API_BASE_URL}/api/recordings/${recordingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: newName }),
      credentials: "include",
    });

    if (!response.ok) {
      console.warn(`[Recording] Backend rename failed: ${response.status}`);
    }
  } catch (error) {
    console.warn("[Recording] Backend rename error:", error);
  }

  // 2. IndexedDB에서 업데이트
  await renameRecordingInDB(recordingId, newName);
}

/**
 * Fetch a single recording
 * - IndexedDB에서 즉시 반환
 */
export async function fetchRecording(
  recordingId: string
): Promise<DBRecording | null> {
  const recording = await getRecordingFromDB(recordingId);
  return recording || null;
}
