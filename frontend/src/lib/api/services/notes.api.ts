/**
 * Notes API Service
 * - 도메인 타입(Note)을 반환
 * - IndexedDB와 Backend API를 추상화
 * - 어댑터를 통해 타입 변환
 */

import type { Note } from "@/lib/types";
import type { ApiNoteResponse } from "../types/api.types";
import type { DBNoteContent } from "@/lib/db/notes";
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
import { dbToNote, dbToNotes, apiToNote, apiToNotes } from "../adapters/note.adapter";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * 모든 노트 가져오기
 * @returns 도메인 Note 배열
 */
export async function fetchAllNotes(): Promise<Note[]> {
  if (USE_LOCAL) {
    const dbNotes = await getNotesFromDB();
    return dbToNotes(dbNotes);  // 🔄 IndexedDB → 도메인 타입 변환
  } else {
    // 백엔드 API 호출
    const res = await fetch("/api/notes");
    if (!res.ok) throw new Error("Failed to fetch notes");
    const apiNotes: ApiNoteResponse[] = await res.json();
    return apiToNotes(apiNotes);  // 🔄 Backend API → 도메인 타입 변환
  }
}

/**
 * 폴더별 노트 가져오기
 * @returns 도메인 Note 배열
 */
export async function fetchNotesByFolder(
  folderId?: string
): Promise<Note[]> {
  if (USE_LOCAL) {
    const dbNotes = folderId
      ? await getNotesByFolderFromDB(folderId)
      : await getNotesFromDB();
    return dbToNotes(dbNotes);
  } else {
    // 백엔드 API 호출
    const url = folderId ? `/api/notes?folderId=${folderId}` : "/api/notes";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch notes");
    const apiNotes: ApiNoteResponse[] = await res.json();
    return apiToNotes(apiNotes);
  }
}

/**
 * 노트 상세 정보 가져오기
 * @returns 도메인 Note 또는 null
 */
export async function fetchNote(noteId: string): Promise<Note | null> {
  if (USE_LOCAL) {
    const dbNote = await getNoteFromDB(noteId);
    return dbNote ? dbToNote(dbNote) : null;
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch note");
    }
    const apiNote: ApiNoteResponse = await res.json();
    return apiToNote(apiNote);
  }
}

/**
 * 노트 생성
 * @param title - 노트 제목
 * @param folderId - 폴더 ID
 * @param files - 첨부 파일 목록
 * @param type - 노트 타입 ("student" | "educator")
 * @returns 생성된 도메인 Note
 */
export async function createNote(
  title: string,
  folderId: string,
  files: File[],
  type: "student" | "educator" = "student"
): Promise<Note> {
  if (USE_LOCAL) {
    // IndexedDB에 노트 생성
    const { createNote: createNoteInDB } = await import("@/lib/db/notes");
    const { saveMultipleFiles } = await import("@/lib/db/files");

    const dbNote = await createNoteInDB(title, folderId, type);

    // 파일 저장
    if (files.length > 0) {
      await saveMultipleFiles(dbNote.id, files);
    }

    return dbToNote(dbNote);
  } else {
    // 백엔드 API 호출 (FormData로 파일 전송)
    const formData = new FormData();
    formData.append("title", title);
    formData.append("folder_id", folderId);  // snake_case
    formData.append("type", type);  // 노트 타입
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/notes", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to create note");
    const apiNote: ApiNoteResponse = await res.json();
    return apiToNote(apiNote);
  }
}

/**
 * 노트 업데이트
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>
): Promise<void> {
  if (USE_LOCAL) {
    // 도메인 타입을 IndexedDB 타입으로 변환 (필요시)
    await updateNoteInDB(noteId, updates as any);
  } else {
    // 백엔드 API 호출 (snake_case 변환 필요)
    const apiUpdates: any = {};
    if (updates.title !== undefined) apiUpdates.title = updates.title;
    if (updates.folderId !== undefined) apiUpdates.folder_id = updates.folderId;
    if (updates.thumbnail !== undefined) apiUpdates.thumbnail = updates.thumbnail;
    if (updates.updatedAt !== undefined) {
      apiUpdates.updated_at = new Date(updates.updatedAt).toISOString();
    }

    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiUpdates),
    });

    if (!res.ok) throw new Error("Failed to update note");
  }
}

/**
 * 노트 삭제
 */
export async function deleteNote(noteId: string): Promise<void> {
  if (USE_LOCAL) {
    await deleteNoteInDB(noteId);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete note");
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
  if (USE_LOCAL) {
    await saveNoteContentInDB(noteId, pageId, blocks);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, blocks }),
    });

    if (!res.ok) throw new Error("Failed to save note content");
  }
}

/**
 * 노트 컨텐츠 가져오기
 */
export async function fetchNoteContent(
  noteId: string,
  pageId: string
): Promise<any[] | null> {
  if (USE_LOCAL) {
    const content = await getNoteContentFromDB(noteId, pageId);
    return content?.blocks || null;
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}/content/${pageId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch note content");
    }
    const data = await res.json();
    return data.blocks;
  }
}
