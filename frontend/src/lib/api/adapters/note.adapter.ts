/**
 * Note Adapter
 * IndexedDB와 Backend API의 노트 타입을 도메인 타입으로 변환
 */

import type { Note } from "@/lib/types";
import type { DBNote } from "@/lib/db";
import type { ApiNoteResponse, ApiNoteCreateRequest } from "../types/api.types";

// ============================================================================
// IndexedDB → 도메인 타입 변환
// ============================================================================

/**
 * IndexedDB 노트를 도메인 노트로 변환
 */
export function dbToNote(dbNote: DBNote): Note {
  return {
    id: dbNote.id,
    title: dbNote.title,
    folderId: dbNote.folderId,
    type: dbNote.type, // student or educator
    createdAt: dbNote.createdAt,
    updatedAt: dbNote.updatedAt,
    thumbnail: dbNote.thumbnail,
  };
}

/**
 * IndexedDB 노트 배열을 도메인 노트 배열로 변환
 */
export function dbToNotes(dbNotes: DBNote[]): Note[] {
  return dbNotes.map(dbToNote);
}

/**
 * 도메인 노트를 IndexedDB 노트로 변환
 */
export function noteToDb(note: Note): DBNote {
  return {
    id: note.id,
    title: note.title,
    folderId: note.folderId,
    type: note.type, // student or educator
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    thumbnail: note.thumbnail,
  };
}

// ============================================================================
// Backend API → 도메인 타입 변환
// ============================================================================

/**
 * Backend API 노트 응답을 도메인 노트로 변환
 */
export function apiToNote(apiNote: ApiNoteResponse): Note {
  return {
    id: apiNote.id,
    title: apiNote.title,
    folderId: apiNote.folder_id,
    type: (apiNote.type as "student" | "educator") || "student", // Default to student if not provided
    createdAt: new Date(apiNote.created_at).getTime(),
    updatedAt: new Date(apiNote.updated_at).getTime(),
    thumbnail: apiNote.thumbnail,
  };
}

/**
 * Backend API 노트 배열을 도메인 노트 배열로 변환
 */
export function apiToNotes(apiNotes: ApiNoteResponse[]): Note[] {
  return apiNotes.map(apiToNote);
}

// ============================================================================
// 도메인 타입 → Backend API 요청 변환
// ============================================================================

/**
 * 노트 생성 요청 변환
 */
export function toApiNoteCreateRequest(
  title: string,
  folderId: string
): ApiNoteCreateRequest {
  return {
    title,
    folder_id: folderId,
  };
}

