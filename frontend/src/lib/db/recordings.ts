/**
 * 녹음본 관리 함수
 */

import { initDB } from "./index";
import type { DBRecording } from "./index";
import { v4 as uuidv4 } from "uuid";

export type { DBRecording };

/**
 * 녹음본 저장
 */
export async function saveRecording(
  noteId: string,
  name: string,
  recordingBlob: Blob,
  duration: number
): Promise<DBRecording> {
  const db = await initDB();
  const recording: DBRecording = {
    id: uuidv4(),
    noteId,
    name,
    recordingData: recordingBlob,
    duration,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recordings"], "readwrite");
    const store = transaction.objectStore("recordings");
    const request = store.add(recording);

    request.onsuccess = () => {
      resolve(recording);
    };

    request.onerror = () => {
      reject(new Error("녹음본 저장 실패"));
    };
  });
}

/**
 * 노트의 모든 녹음본 가져오기
 */
export async function getRecordingsByNote(
  noteId: string
): Promise<DBRecording[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recordings"], "readonly");
    const store = transaction.objectStore("recordings");
    const index = store.index("noteId");
    const request = index.getAll(noteId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("녹음본 목록을 가져올 수 없습니다."));
    };
  });
}

/**
 * 녹음본 가져오기
 */
export async function getRecording(
  recordingId: string
): Promise<DBRecording | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recordings"], "readonly");
    const store = transaction.objectStore("recordings");
    const request = store.get(recordingId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("녹음본을 가져올 수 없습니다."));
    };
  });
}

/**
 * 녹음본 삭제
 */
export async function deleteRecording(recordingId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recordings"], "readwrite");
    const store = transaction.objectStore("recordings");
    const request = store.delete(recordingId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("녹음본 삭제 실패"));
  });
}

/**
 * 노트의 모든 녹음본 삭제
 */
export async function deleteRecordingsByNote(noteId: string): Promise<void> {
  const recordings = await getRecordingsByNote(noteId);
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recordings"], "readwrite");
    const store = transaction.objectStore("recordings");

    let completed = 0;
    const total = recordings.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const recording of recordings) {
      const request = store.delete(recording.id);

      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error("녹음본 삭제 실패"));
      };
    }
  });
}

/**
 * 녹음본 이름 변경
 */
export async function renameRecording(
  recordingId: string,
  newName: string
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recordings"], "readwrite");
    const store = transaction.objectStore("recordings");
    const getRequest = store.get(recordingId);

    getRequest.onsuccess = () => {
      const recording = getRequest.result as DBRecording;
      if (!recording) {
        reject(new Error("녹음본을 찾을 수 없습니다."));
        return;
      }

      recording.name = newName;

      const updateRequest = store.put(recording);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(new Error("녹음본 이름 변경 실패"));
    };

    getRequest.onerror = () => {
      reject(new Error("녹음본을 가져올 수 없습니다."));
    };
  });
}

/**
 * 녹음본 URL 생성 (재생용)
 */
export function createRecordingURL(recordingBlob: Blob): string {
  return URL.createObjectURL(recordingBlob);
}

/**
 * 녹음본 URL 해제 (메모리 정리)
 */
export function revokeRecordingURL(url: string): void {
  URL.revokeObjectURL(url);
}
