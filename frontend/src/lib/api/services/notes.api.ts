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
  updateNoteId as updateNoteIdInDB,
  getNote as getNoteFromDB,
  updateNote as updateNoteInDB,
  deleteNote as deleteNoteInDB,
  saveNoteContent as saveNoteContentInDB,
  getNoteContent as getNoteContentFromDB,
  checkDuplicateNoteTitle,
} from "@/lib/db/notes";
import { dbToNote, dbToNotes, apiToNote, apiToNotes } from "../adapters/note.adapter";
import { getAuthHeaders } from "../client";
// import { getSyncQueue } from "@/lib/sync"; // TODO: Use useSyncStore instead

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(), // Add JWT token for authentication
      },
    });
    if (!res.ok) throw new Error("Failed to fetch notes");
    const apiNotes: ApiNoteResponse[] = await res.json();
    return apiToNotes(apiNotes);  // 🔄 Backend API → 도메인 타입 변환
  }
}

/**
 * 폴더별 노트 가져오기
 * Returns local data immediately, then syncs with server in background
 * @returns 도메인 Note 배열
 */
export async function fetchNotesByFolder(
  folderId?: string
): Promise<Note[]> {
  console.log('[notes.api] fetchNotesByFolder called with folderId:', folderId);
  
  // 1. 로컬 데이터 우선 반환 (빠른 응답)
  const dbNotes = folderId
    ? await getNotesByFolderFromDB(folderId)
    : await getNotesFromDB();
  console.log('[notes.api] IndexedDB returned notes:', dbNotes.length, 'notes');
  const localNotes = dbToNotes(dbNotes);
  
  // 2. 백그라운드에서 서버 동기화
  syncNotesInBackground(localNotes, folderId);
  
  return localNotes;
}

/**
 * Background note synchronization
 */
async function syncNotesInBackground(localNotes: Note[], folderId?: string): Promise<void> {
  try {
    // 서버에서 최신 데이터 가져오기
    const url = folderId ? `${API_BASE_URL}/api/notes?folderId=${folderId}` : `${API_BASE_URL}/api/notes`;
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });
    
    if (!res.ok) {
      console.warn('[notes.api] Failed to fetch from server for sync:', res.status);
      return;
    }
    
    const apiNotes: ApiNoteResponse[] = await res.json();
    const serverNotes = apiToNotes(apiNotes);
    
    // 동기화할 데이터 찾기
    const { syncNotes } = await import('../sync-utils');
    const { toUpdate, toAdd, toDelete } = await syncNotes(localNotes, serverNotes);
    
    // IndexedDB 업데이트
    if (toUpdate.length > 0 || toAdd.length > 0 || toDelete.length > 0) {
      const { saveNote, permanentlyDeleteNote } = await import('@/lib/db/notes');
      const { noteToDb } = await import('../adapters/note.adapter');
      
      // toUpdate와 toAdd 모두 saveNote로 처리 (put 메서드 사용)
      const allToSave = [...toUpdate, ...toAdd];
      
      for (const note of allToSave) {
        const dbNote = noteToDb(note);
        await saveNote(dbNote);
      }
      
      // toDelete 처리 - 서버에서 삭제된 노트는 로컬에서도 영구 삭제
      for (const noteId of toDelete) {
        await permanentlyDeleteNote(noteId);
      }
      
      console.log(`[notes.api] ✅ Synced ${toUpdate.length} updates, ${toAdd.length} new, ${toDelete.length} deleted notes from server`);
      
      // React Query cache 무효화
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notes-synced'));
      }
    }
  } catch (error) {
    console.error('[notes.api] Background sync failed:', error);
  }
}

/**
 * 노트 상세 정보 가져오기
 * Returns local data immediately if available, then syncs with server
 * @returns 도메인 Note 또는 null
 */
export async function fetchNote(noteId: string): Promise<Note | null> {
  console.log('[notes.api] fetchNote called with noteId:', noteId);
  
  // 1. 로컬 데이터 우선 확인
  const dbNote = await getNoteFromDB(noteId);
  console.log('[notes.api] IndexedDB result:', dbNote ? 'Found note' : 'Note not found');
  
  const localNote = dbNote ? dbToNote(dbNote) : null;
  
  // 2. 백그라운드에서 서버 동기화 (로컬에 없으면 동기 호출)
  if (!localNote) {
    // 로컬에 없으면 서버에서 즉시 가져오기
    return await fetchNoteFromServer(noteId);
  }
  
  // 로컬 데이터가 있으면 백그라운드에서 동기화
  syncSingleNoteInBackground(noteId, localNote);
  
  return localNote;
}

/**
 * Fetch note from server (synchronous)
 */
async function fetchNoteFromServer(noteId: string): Promise<Note | null> {
  try {
    console.log('[notes.api] Fetching from backend API:', `${API_BASE_URL}/api/notes/${noteId}`);
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });
    
    console.log('[notes.api] Backend response status:', res.status);
    if (!res.ok) {
      if (res.status === 404) {
        console.log('[notes.api] Note not found in backend (404)');
        return null;
      }
      throw new Error("Failed to fetch note");
    }
    
    const apiNote: ApiNoteResponse = await res.json();
    console.log('[notes.api] Backend note data:', apiNote);
    const serverNote = apiToNote(apiNote);
    
    // IndexedDB에 저장
    const { noteToDb } = await import('../adapters/note.adapter');
    const { saveNote } = await import('@/lib/db/notes');
    const dbNote = noteToDb(serverNote);
    await saveNote(dbNote);
    
    return serverNote;
  } catch (error) {
    console.error('[notes.api] Failed to fetch from server:', error);
    return null;
  }
}

/**
 * Background single note synchronization
 */
async function syncSingleNoteInBackground(noteId: string, localNote: Note): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(),
      },
    });
    
    if (!res.ok) {
      console.warn('[notes.api] Failed to fetch from server for sync:', res.status);
      return;
    }
    
    const apiNote: ApiNoteResponse = await res.json();
    const serverNote = apiToNote(apiNote);
    
    // 서버가 더 최신이면 업데이트
    if (serverNote.updatedAt > localNote.updatedAt) {
      const { saveNote } = await import('@/lib/db/notes');
      const { noteToDb } = await import('../adapters/note.adapter');
      const dbNote = noteToDb(serverNote);
      
      await saveNote(dbNote);
      
      console.log(`[notes.api] ✅ Synced note from server: ${noteId}`);
      
      // React Query cache 무효화
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('note-synced', { detail: { noteId } }));
      }
    }
  } catch (error) {
    console.error('[notes.api] Background sync failed:', error);
  }
}

/**
 * 노트 생성
 * IndexedDB에 즉시 저장, 백엔드로 동시 동기화
 * @returns 생성된 도메인 Note
 */
export async function createNote(
  title: string,
  folderId: string,
  files: File[],
  type: "student" | "educator" = "student"
): Promise<Note> {
  console.log(`[notes.api] 📝 Creating note with type: ${type}`); // Debug log
  
  // Check for duplicate title in the same folder
  const isDuplicate = await checkDuplicateNoteTitle(title, folderId);
  if (isDuplicate) {
    throw new Error(`이 폴더에 이미 같은 이름의 노트가 있습니다: "${title}"`);
  }

  let localResult: Note | null = null;
  let noteId: string | null = null;

  // 1. IndexedDB에 즉시 저장
  try {
    const { createNote: createNoteInDB } = await import("@/lib/db/notes");
    const { saveMultipleFiles } = await import("@/lib/db/files");

    const dbNote = await createNoteInDB(title, folderId, type);
    noteId = dbNote.id; // Use this ID for both local and backend

    // 파일도 IndexedDB에 저장
    if (files.length > 0) {
      await saveMultipleFiles(dbNote.id, files);
    }

    localResult = dbToNote(dbNote);
    console.log(`[notes.api] Note saved to IndexedDB with ID: ${noteId}, type: ${type}`);
  } catch (error) {
    console.error("[notes.api] Failed to save to IndexedDB:", error);
  }

  // 2. 백엔드로 동기화 (파일 포함)
  const syncToBackend = async () => {
    try {
      const formData = new FormData();
      formData.append("id", noteId!); // Send the same ID to backend
      formData.append("title", title);
      formData.append("folder_id", folderId);
      formData.append("type", type); // Send note type to backend
      files.forEach((file) => formData.append("files", file));

      console.log(`[notes.api] 🔄 Syncing to backend:`, {
        url: `${API_BASE_URL}/api/notes`,
        noteId,
        title,
        folderId,
        type,
        filesCount: files.length,
        hasAuthToken: !!localStorage.getItem("authToken"),
      });

      const res = await fetch(`${API_BASE_URL}/api/notes`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      console.log(`[notes.api] Backend response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[notes.api] Backend error response:`, errorText);
        throw new Error(`Failed to create note on backend: ${res.status} ${errorText}`);
      }
      
      const backendNote: ApiNoteResponse = await res.json();
      console.log(`[notes.api] ✅ Note synced to backend:`, title, `ID: ${backendNote.id}`);
      
      return backendNote;
    } catch (error) {
      console.error("[notes.api] Failed to sync to backend:", error);
      // 재시도 큐에 추가
      // TODO: Implement retry queue using useSyncStore
      // getSyncQueue().addTask('note-create', { id: noteId, title, folderId, files });
      return null;
    }
  };

  // 백그라운드 동기화 시작
  syncToBackend();

  // 로컬 결과 즉시 반환
  if (localResult) {
    return localResult;
  }

  // IndexedDB 실패 시 API 직접 호출
  const formData = new FormData();
  formData.append("title", title);
  formData.append("folder_id", folderId);
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE_URL}/api/notes`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to create note");
  const apiNote: ApiNoteResponse = await res.json();
  return apiToNote(apiNote);
}

/**
 * 노트 업데이트
 * IndexedDB에 즉시 저장, 백엔드로 동시 동기화
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>
): Promise<void> {
  // 1. IndexedDB에 즉시 업데이트
  try {
    await updateNoteInDB(noteId, updates as any);
    console.log(`[notes.api] Note updated in IndexedDB:`, noteId);
  } catch (error) {
    console.error("[notes.api] Failed to update in IndexedDB:", error);
  }

  // 2. 백엔드로 동기화
  const syncToBackend = async () => {
    // API 형식으로 변환 (try 블록 밖에서 정의)
    const apiUpdates: any = {};
    if (updates.title !== undefined) apiUpdates.title = updates.title;
    if (updates.folderId !== undefined) apiUpdates.folder_id = updates.folderId;
    if (updates.thumbnail !== undefined) apiUpdates.thumbnail = updates.thumbnail;
    if (updates.updatedAt !== undefined) {
      apiUpdates.updated_at = new Date(updates.updatedAt).toISOString();
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(apiUpdates),
      });

      if (!res.ok) throw new Error("Failed to update note on backend");
      console.log(`[notes.api] Note update synced to backend:`, noteId);
    } catch (error) {
      console.error("[notes.api] Failed to sync update to backend:", error);
      // 재시도 큐에 추가
      // TODO: Implement retry queue using useSyncStore
      // getSyncQueue().addTask('note-update', { id: noteId, updates: apiUpdates });
    }
  };

  // 백그라운드 동기화 시작
  syncToBackend();
}

/**
 * 노트 삭제
 * IndexedDB에서 즉시 삭제, 백엔드로 동시 동기화
 */
export async function deleteNote(noteId: string): Promise<void> {
  // 1. IndexedDB에서 즉시 삭제
  try {
    await deleteNoteInDB(noteId);
    console.log(`[notes.api] Note deleted from IndexedDB:`, noteId);
  } catch (error) {
    console.error("[notes.api] Failed to delete from IndexedDB:", error);
  }

  // 2. 백엔드로 동기화
  const syncToBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) throw new Error("Failed to delete note on backend");
      console.log(`[notes.api] Note deletion synced to backend:`, noteId);
    } catch (error) {
      console.error("[notes.api] Failed to sync deletion to backend:", error);
      // 재시도 큐에 추가
      // TODO: Implement retry queue using useSyncStore
      // getSyncQueue().addTask('note-delete', { id: noteId });
    }
  };

  // 백그라운드 동기화 시작
  syncToBackend();
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
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(), // Add JWT token for authentication
      },
      credentials: "include",
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
    const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/content/${pageId}`, {
      credentials: "include",
      headers: {
        ...getAuthHeaders(), // Add JWT token for authentication
      },
    });
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch note content");
    }
    const data = await res.json();
    return data.blocks;
  }
}

/**
 * Trash API - Get all trashed notes
 */
export async function fetchTrashedNotes(): Promise<Note[]> {
  console.log('[notes.api] 🗑️ Fetching trashed notes');
  
  const res = await fetch(`${API_BASE_URL}/api/notes/trash/list`, {
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    console.error('[notes.api] ❌ Failed to fetch trashed notes:', res.status);
    throw new Error("Failed to fetch trashed notes");
  }

  const apiNotes: ApiNoteResponse[] = await res.json();
  console.log('[notes.api] ✅ Fetched trashed notes:', apiNotes.length);
  
  return apiToNotes(apiNotes);
}

/**
 * Trash API - Restore a trashed note
 */
export async function restoreNote(noteId: string): Promise<{ message: string; title?: string }> {
  console.log('[notes.api] 🔄 Restoring note:', noteId);

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    console.error('[notes.api] ❌ Failed to restore note:', res.status);
    throw new Error("Failed to restore note");
  }

  const result = await res.json();
  console.log('[notes.api] ✅ Note restored:', result);
  
  return result;
}

/**
 * Trash API - Permanently delete a trashed note
 */
export async function permanentlyDeleteNote(noteId: string): Promise<{ message: string }> {
  console.log('[notes.api] 🗑️ Permanently deleting note:', noteId);

  const res = await fetch(`${API_BASE_URL}/api/notes/${noteId}/permanent`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    console.error('[notes.api] ❌ Failed to permanently delete note:', res.status);
    throw new Error("Failed to permanently delete note");
  }

  const result = await res.json();
  console.log('[notes.api] ✅ Note permanently deleted:', result);
  
  return result;
}
