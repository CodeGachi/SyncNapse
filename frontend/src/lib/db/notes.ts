/**
 * 노트 관리 함수
 */

import { initDB } from "./index";
import type { DBNote, DBNoteContent } from "./index";
import { v4 as uuidv4 } from "uuid";
import { deleteFilesByNote } from "./files";
import { deleteRecordingsByNote } from "./recordings";
import { moveNoteToTrash } from "./trash";

export type { DBNote, DBNoteContent };

/**
 * 모든 노트 가져오기
 */
export async function getAllNotes(): Promise<DBNote[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["notes"], "readonly");
    const store = transaction.objectStore("notes");
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("노트 목록을 가져올 수 없습니다."));
    };
  });
}

/**
 * 특정 폴더의 노트들 가져오기
 */
export async function getNotesByFolder(folderId: string): Promise<DBNote[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["notes"], "readonly");
    const store = transaction.objectStore("notes");
    const index = store.index("folderId");
    const request = index.getAll(folderId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("폴더의 노트를 가져올 수 없습니다."));
    };
  });
}

/**
 * 노트 생성
 * @param title - 노트 제목
 * @param folderId - 폴더 ID
 * @param type - 노트 타입 ("student" | "educator")
 */
export async function createNote(
  title: string,
  folderId: string = "root",
  type: "student" | "educator" = "student"
): Promise<DBNote> {
  const db = await initDB();

  const note: DBNote = {
    id: uuidv4(),
    title,
    folderId,
    type,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    // Educator 노트의 기본 공유 설정
    ...(type === "educator" && {
      accessControl: {
        isPublic: false,
        allowedUsers: [],
        allowComments: true,
        realTimeInteraction: true,
      },
    }),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["notes"], "readwrite");
    const store = transaction.objectStore("notes");
    const request = store.add(note);

    request.onsuccess = () => {
      resolve(note);
    };

    request.onerror = () => {
      reject(new Error(`노트 생성 실패: ${request.error?.message || "Unknown error"}`));
    };
  });
}

/**
 * 노트 가져오기
 */
export async function getNote(noteId: string): Promise<DBNote | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["notes"], "readonly");
    const store = transaction.objectStore("notes");
    const request = store.get(noteId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("노트를 가져올 수 없습니다."));
    };
  });
}

/**
 * 노트 업데이트
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Omit<DBNote, "id" | "createdAt">>
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["notes"], "readwrite");
    const store = transaction.objectStore("notes");
    const getRequest = store.get(noteId);

    getRequest.onsuccess = () => {
      const note = getRequest.result as DBNote;
      if (!note) {
        reject(new Error("노트를 찾을 수 없습니다."));
        return;
      }

      const updatedNote = {
        ...note,
        ...updates,
        updatedAt: Date.now(),
      };

      const updateRequest = store.put(updatedNote);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(new Error("노트 업데이트 실패"));
    };

    getRequest.onerror = () => {
      reject(new Error("노트를 가져올 수 없습니다."));
    };
  });
}

/**
 * 노트 삭제 (휴지통으로 이동)
 */
export async function deleteNote(noteId: string): Promise<void> {
  const db = await initDB();

  // 노트 정보 가져오기
  const note = await new Promise<DBNote>((resolve, reject) => {
    const transaction = db.transaction(["notes"], "readonly");
    const store = transaction.objectStore("notes");
    const request = store.get(noteId);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        reject(new Error("노트를 찾을 수 없습니다."));
      }
    };
    request.onerror = () => reject(new Error("노트를 가져올 수 없습니다."));
  });

  // 휴지통으로 이동
  await moveNoteToTrash(note);

  // 파일, 녹음본, 컨텐츠는 그대로 유지 (복구 시 필요)
}

/**
 * 노트 영구 삭제 (휴지통에서 사용)
 */
export async function permanentlyDeleteNote(noteId: string): Promise<void> {
  // 노트 관련 파일 삭제
  await deleteFilesByNote(noteId);

  // 노트 관련 녹음본 삭제
  await deleteRecordingsByNote(noteId);

  // 노트 컨텐츠 삭제
  await deleteNoteContentByNote(noteId);

  // 노트 자체 삭제
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["notes"], "readwrite");
    const store = transaction.objectStore("notes");
    const request = store.delete(noteId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("노트 영구 삭제 실패"));
  });
}

/**
 * 폴더의 모든 노트 삭제
 */
export async function deleteNotesByFolder(folderId: string): Promise<void> {
  const notes = await getNotesByFolder(folderId);
  for (const note of notes) {
    await deleteNote(note.id);
  }
}

/**
 * 노트 컨텐츠 저장
 */
export async function saveNoteContent(
  noteId: string,
  pageId: string,
  blocks: any[]
): Promise<void> {
  const db = await initDB();
  const content: DBNoteContent = {
    id: `${noteId}-${pageId}`,
    noteId,
    pageId,
    blocks,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["noteContent"], "readwrite");
    const store = transaction.objectStore("noteContent");
    const request = store.put(content);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("노트 컨텐츠 저장 실패"));
  });
}

/**
 * 노트 컨텐츠 가져오기
 */
export async function getNoteContent(
  noteId: string,
  pageId: string
): Promise<DBNoteContent | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["noteContent"], "readonly");
    const store = transaction.objectStore("noteContent");
    const request = store.get(`${noteId}-${pageId}`);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("노트 컨텐츠를 가져올 수 없습니다."));
    };
  });
}

/**
 * 노트의 모든 페이지 컨텐츠 가져오기
 */
export async function getAllNoteContent(
  noteId: string
): Promise<DBNoteContent[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["noteContent"], "readonly");
    const store = transaction.objectStore("noteContent");
    const index = store.index("noteId");
    const request = index.getAll(noteId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error("노트 컨텐츠를 가져올 수 없습니다."));
    };
  });
}

/**
 * 노트의 모든 컨텐츠 삭제
 */
export async function deleteNoteContentByNote(noteId: string): Promise<void> {
  const contents = await getAllNoteContent(noteId);
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["noteContent"], "readwrite");
    const store = transaction.objectStore("noteContent");

    let completed = 0;
    const total = contents.length;

    if (total === 0) {
      resolve();
      return;
    }

    for (const content of contents) {
      const request = store.delete(content.id);

      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error("노트 컨텐츠 삭제 실패"));
      };
    }
  });
}