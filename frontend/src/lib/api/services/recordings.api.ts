/**
 * Recordings API V2 - IndexedDB 우선 저장 + 백엔드 동기화
 *
 * 새로운 구조:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 동기화 큐에 추가
 * 3. 백그라운드에서 백엔드와 동기화
 */

import type { DBRecording } from "@/lib/db/recordings";
import {
  saveRecording as saveRecordingInDB,
  getRecordingsByNote as getRecordingsByNoteFromDB,
  getRecording as getRecordingFromDB,
  deleteRecording as deleteRecordingInDB,
  renameRecording as renameRecordingInDB,
} from "@/lib/db/recordings";
import { useSyncStore } from "@/lib/sync/sync-store";

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
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function saveRecording(
  noteId: string,
  name: string,
  recordingBlob: Blob,
  duration: number
): Promise<DBRecording> {
  // 1. IndexedDB에 즉시 저장
  const dbRecording = await saveRecordingInDB(
    noteId,
    name,
    recordingBlob,
    duration
  );

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "recording",
    entityId: dbRecording.id,
    operation: "create",
    data: {
      noteId,
      name,
      duration,
      recordingSize: recordingBlob.size,
      recordingType: recordingBlob.type,
    },
  });

  return dbRecording;
}

/**
 * Delete recording
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  // 1. IndexedDB에서 삭제
  await deleteRecordingInDB(recordingId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "recording",
    entityId: recordingId,
    operation: "delete",
    data: null,
  });
}

/**
 * Rename recording
 * - IndexedDB에서 즉시 업데이트
 * - 동기화 큐에 추가
 */
export async function renameRecording(
  recordingId: string,
  newName: string
): Promise<void> {
  // 1. IndexedDB에서 업데이트
  await renameRecordingInDB(recordingId, newName);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "recording",
    entityId: recordingId,
    operation: "update",
    data: {
      name: newName,
    },
  });
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
