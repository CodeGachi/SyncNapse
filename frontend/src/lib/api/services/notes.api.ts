/**
 * Notes API Service V2 - IndexedDB 우선 저장 + 백엔드 동기화
 *
 * 새로운 구조:
 * 1. 모든 변경사항은 IndexedDB에 즉시 저장 (오프라인 우선)
 * 2. 동기화 큐에 추가
 * 3. 백그라운드에서 백엔드와 동기화
 *
 * 기존 구조 (notes.api.ts)와 호환성 유지
 */

import type { Note } from "@/lib/types";
import {
  getAllNotes as getNotesFromDB,
  getNotesByFolder as getNotesByFolderFromDB,
  createNote as createNoteInDB,
  getNote as getNoteFromDB,
  updateNote as updateNoteInDB,
  deleteNote as deleteNoteInDB,
  saveNoteContent as saveNoteContentInDB,
  getNoteContent as getNoteContentFromDB,
} from "@/lib/db/notes";
import { useSyncStore } from "@/lib/sync/sync-store";

/**
 * 모든 노트 가져오기
 * - IndexedDB에서 즉시 반환
 * - 백엔드 동기화는 백그라운드에서 처리
 */
export async function fetchAllNotes(): Promise<Note[]> {
  const dbNotes = await getNotesFromDB();
  return dbNotes as Note[];
}

/**
 * 폴더별 노트 가져오기
 */
export async function fetchNotesByFolder(folderId?: string): Promise<Note[]> {
  const dbNotes = folderId
    ? await getNotesByFolderFromDB(folderId)
    : await getNotesFromDB();
  return dbNotes as Note[];
}

/**
 * 노트 상세 정보 가져오기
 */
export async function fetchNote(noteId: string): Promise<Note | null> {
  const dbNote = await getNoteFromDB(noteId);
  return dbNote ? (dbNote as Note) : null;
}

/**
 * 노트 생성
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function createNote(
  title: string,
  folderId: string,
  files: File[],
  type: "student" | "educator" = "student"
): Promise<Note> {
  // 1. IndexedDB에 즉시 저장
  const { createNote: createNoteInDB } = await import("@/lib/db/notes");

  const dbNote = await createNoteInDB(title, folderId, type);

  // 2. 파일 저장 (API 레이어 사용 → 백엔드 업로드 + 동기화 큐 추가 포함)
  if (files.length > 0) {
    const { saveMultipleFiles } = await import("./files.api");
    await saveMultipleFiles(dbNote.id, files);
  }

  // 3. 노트 자체를 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "note",
    entityId: dbNote.id,
    operation: "create",
    data: {
      title: dbNote.title,
      folder_id: dbNote.folderId,
      type: dbNote.type,
      created_at: new Date(dbNote.createdAt).toISOString(),
      updated_at: new Date(dbNote.updatedAt).toISOString(),
    },
  });

  // 4. 즉시 반환 (백엔드 동기화는 백그라운드에서 처리)
  return dbNote as Note;
}

/**
 * 노트 업데이트
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>
): Promise<void> {
  // 1. IndexedDB에 즉시 저장
  await updateNoteInDB(noteId, updates as any);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "note",
    entityId: noteId,
    operation: "update",
    data: {
      ...updates,
      ...(updates.folderId && { folder_id: updates.folderId }),
      ...(updates.updatedAt && {
        updated_at: new Date(updates.updatedAt).toISOString(),
      }),
    },
  });
}

/**
 * 노트 삭제
 * - IndexedDB에서 즉시 삭제
 * - 동기화 큐에 추가
 */
export async function deleteNote(noteId: string): Promise<void> {
  // 1. IndexedDB에서 즉시 삭제
  await deleteNoteInDB(noteId);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "note",
    entityId: noteId,
    operation: "delete",
  });
}

/**
 * 노트 컨텐츠 저장
 * - IndexedDB에 즉시 저장
 * - 동기화 큐에 추가
 */
export async function saveNoteContent(
  noteId: string,
  pageId: string,
  blocks: any[]
): Promise<void> {
  // 1. IndexedDB에 즉시 저장
  await saveNoteContentInDB(noteId, pageId, blocks);

  // 2. 동기화 큐에 추가
  const syncStore = useSyncStore.getState();
  syncStore.addToSyncQueue({
    entityType: "noteContent",
    entityId: `${noteId}-${pageId}`,
    operation: "update",
    data: {
      note_id: noteId,
      page_id: pageId,
      blocks,
    },
  });
}

/**
 * 노트 컨텐츠 가져오기
 */
export async function fetchNoteContent(
  noteId: string,
  pageId: string
): Promise<any[] | null> {
  const content = await getNoteContentFromDB(noteId, pageId);
  return content?.blocks || null;
}
