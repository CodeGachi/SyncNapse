/**
 * Recordings API V2 - 즉시 백엔드 업로드 + IndexedDB 메타데이터 저장 (HATEOAS)
 * Uses HAL links for API navigation
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
import { createLogger } from "@/lib/utils/logger";
import { getRootUrl, halFetchUrl, HalResource, HalError } from "../hal";

const log = createLogger("RecordingsAPI");

// ==========================================
// URL Builders (HATEOAS)
// ==========================================

async function getAudioRecordingsUrl(): Promise<string> {
  const url = await getRootUrl("audioRecordings");
  if (url) return url;
  
  // Fallback
  const baseUrl = await getRootUrl("self");
  return baseUrl ? `${baseUrl}/audio/recordings` : "/audio/recordings";
}

async function getRecordingsUrl(): Promise<string> {
  const url = await getRootUrl("recordings");
  if (url) return url;
  
  // Fallback
  const baseUrl = await getRootUrl("self");
  return baseUrl ? `${baseUrl}/recordings` : "/recordings";
}

async function getRecordingUrl(recordingId: string): Promise<string> {
  const recordingsUrl = await getRecordingsUrl();
  return `${recordingsUrl}/${recordingId}`;
}

// ==========================================
// Recordings API Functions (HATEOAS)
// ==========================================

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

  // 1. 즉시 백엔드에 업로드 - HATEOAS
  const uploadUrl = await getAudioRecordingsUrl();
  
  const formData = new FormData();
  formData.append("file", recordingBlob, `${name}.webm`);
  formData.append("noteId", noteId);
  formData.append("title", name);
  formData.append("durationSec", String(duration));

  const response = await fetch(uploadUrl, {
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

  log.info(`✅ Uploaded to backend: ${uploadResult.id}`);

  return dbRecording;
}

/**
 * Delete recording
 * - 즉시 백엔드에서 삭제
 * - IndexedDB에서도 삭제
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  // 1. 백엔드에서 삭제 시도 - HATEOAS
  try {
    const deleteUrl = await getRecordingUrl(recordingId);
    await halFetchUrl<HalResource>(deleteUrl, { method: "DELETE" });
  } catch (error) {
    // 404는 이미 삭제된 것으로 간주
    if (error instanceof HalError && error.status === 404) {
      log.debug(`Recording already deleted on backend: ${recordingId}`);
    } else {
      log.warn("Backend delete error:", error);
    }
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
  // 1. 백엔드 업데이트 시도 - HATEOAS
  try {
    const updateUrl = await getRecordingUrl(recordingId);
    await halFetchUrl<HalResource>(updateUrl, {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });
  } catch (error) {
    log.warn("Backend rename error:", error);
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
