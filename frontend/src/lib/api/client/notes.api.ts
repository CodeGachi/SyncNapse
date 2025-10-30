/**
 * Notes API - Backend와 IndexedDB를 추상화
 */

import type { DBNote, DBNoteContent } from "@/lib/db/notes";
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

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * 모든 노트 가져오기
 */
export async function fetchAllNotes(): Promise<DBNote[]> {
  if (USE_LOCAL) {
    return await getNotesFromDB();
  } else {
    // 백엔드 API 호출
    const res = await fetch("/api/notes");
    if (!res.ok) throw new Error("Failed to fetch notes");
    return await res.json();
  }
}

/**
 * 폴더별 노트 가져오기
 */
export async function fetchNotesByFolder(
  folderId?: string
): Promise<DBNote[]> {
  if (USE_LOCAL) {
    return folderId
      ? await getNotesByFolderFromDB(folderId)
      : await getNotesFromDB();
  } else {
    // 백엔드 API 호출
    const url = folderId ? `/api/notes?folderId=${folderId}` : "/api/notes";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch notes");
    return await res.json();
  }
}

/**
 * 노트 상세 정보 가져오기
 */
export async function fetchNote(noteId: string): Promise<DBNote | null> {
  if (USE_LOCAL) {
    const note = await getNoteFromDB(noteId);
    return note || null;
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch note");
    }
    return await res.json();
  }
}

/**
 * 노트 생성
 */
export async function createNote(
  title: string,
  folderId: string,
  files: File[]
): Promise<DBNote> {
  if (USE_LOCAL) {
    // IndexedDB에 노트 생성
    const { createNote: createNoteInDB } = await import("@/lib/db/notes");
    const { saveMultipleFiles } = await import("@/lib/db/files");

    const note = await createNoteInDB(title, folderId);

    // 파일 저장
    if (files.length > 0) {
      await saveMultipleFiles(note.id, files);
    }

    return note;
  } else {
    // 백엔드 API 호출 (FormData로 파일 전송)
    const formData = new FormData();
    formData.append("title", title);
    formData.append("folderId", folderId);
    files.forEach((file) => formData.append("files", file));

    const res = await fetch("/api/notes", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to create note");
    return await res.json();
  }
}

/**
 * 노트 업데이트
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Omit<DBNote, "id" | "createdAt">>
): Promise<void> {
  if (USE_LOCAL) {
    await updateNoteInDB(noteId, updates);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
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
