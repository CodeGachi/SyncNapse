/**
 * Notes API Service (HATEOAS)
 * - Uses HAL links for API navigation
 * - Domain types (Note) returned
 * - IndexedDB and Backend API abstracted
 */

import { createLogger } from "@/lib/utils/logger";
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
import { getAccessToken } from "@/lib/auth/token-manager";
import {
  halFetchUrl,
  getRootUrl,
  HalResource,
  HalError,
  getApiBaseUrl,
  buildUrl,
  storeResourceLinks,
  expandTemplate,
} from "../hal";

const log = createLogger("NotesAPI");
const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

// HAL Resource types
interface NoteResource extends HalResource, ApiNoteResponse {}
interface NotesListResource extends HalResource {
  items: NoteResource[];
  count: number;
}

// ==========================================
// URL Builders (HATEOAS)
// ==========================================

async function getNotesUrl(folderId?: string): Promise<string> {
  const baseUrl = await getRootUrl("notes");
  if (!baseUrl) {
    return `${getApiBaseUrl()}/notes${folderId ? `?folderId=${folderId}` : ""}`;
  }
  return folderId ? `${baseUrl}?folderId=${folderId}` : baseUrl;
}

async function getNoteUrl(noteId: string): Promise<string> {
  // Try templated link first
  const templateUrl = await getRootUrl("noteById", { noteId });
  if (templateUrl) return templateUrl;
  
  // Fallback
  const baseUrl = await getRootUrl("notes");
  return baseUrl ? `${baseUrl}/${noteId}` : `${getApiBaseUrl()}/notes/${noteId}`;
}

async function getNoteContentUrl(noteId: string): Promise<string> {
  const templateUrl = await getRootUrl("noteContent", { noteId });
  if (templateUrl) return templateUrl;
  
  const noteUrl = await getNoteUrl(noteId);
  return `${noteUrl}/content`;
}

async function getTrashedNotesUrl(): Promise<string> {
  const url = await getRootUrl("noteTrashedList");
  return url || `${getApiBaseUrl()}/notes/trash/list`;
}

// ==========================================
// Notes API Functions (HATEOAS)
// ==========================================

/**
 * Fetch all notes
 * @returns Domain Note array
 */
export async function fetchAllNotes(): Promise<Note[]> {
  if (USE_LOCAL) {
    const dbNotes = await getNotesFromDB();
    return dbToNotes(dbNotes);
  } else {
    const url = await getNotesUrl();
    const response = await halFetchUrl<NotesListResource>(url, { method: "GET" });
    
    // Store links from response for future navigation
    if (response._links) {
      log.debug("Available note list links:", Object.keys(response._links));
    }
    
    const apiNotes = Array.isArray(response) ? response : (response.items || response);
    return apiToNotes(apiNotes as ApiNoteResponse[]);
  }
}

/**
 * Fetch notes by folder
 * Returns local data immediately, syncs with server in background
 */
export async function fetchNotesByFolder(folderId?: string): Promise<Note[]> {
  log.debug("fetchNotesByFolder called with folderId:", folderId);

  // 1. Return local data first (fast response)
  const dbNotes = folderId
    ? await getNotesByFolderFromDB(folderId)
    : await getNotesFromDB();
  log.debug("IndexedDB returned notes:", dbNotes.length, "notes");
  const localNotes = dbToNotes(dbNotes);
  
  // 2. Background server sync
  syncNotesInBackground(localNotes, folderId);
  
  return localNotes;
}

/**
 * Background note synchronization
 */
async function syncNotesInBackground(
  localNotes: Note[],
  folderId?: string
): Promise<void> {
  try {
    const url = await getNotesUrl(folderId);
    const response = await halFetchUrl<NotesListResource>(url, { method: "GET" });

    const apiNotes = Array.isArray(response) ? response : (response.items || response);
    const serverNotes = apiToNotes(apiNotes as ApiNoteResponse[]);
    
    // Find data to sync
    const { syncNotes } = await import("../sync-utils");
    const { toUpdate, toAdd, toDelete } = await syncNotes(localNotes, serverNotes);
    
    // Update IndexedDB
    if (toUpdate.length > 0 || toAdd.length > 0 || toDelete.length > 0) {
      const { saveNote, permanentlyDeleteNote } = await import("@/lib/db/notes");
      const { noteToDb } = await import("../adapters/note.adapter");
      
      const allToSave = [...toUpdate, ...toAdd];
      
      for (const note of allToSave) {
        const dbNote = noteToDb(note);
        await saveNote(dbNote);
      }
      
      for (const noteId of toDelete) {
        await permanentlyDeleteNote(noteId);
      }
      
      log.info(
        `✅ Synced ${toUpdate.length} updates, ${toAdd.length} new, ${toDelete.length} deleted notes from server`
      );

      // Invalidate React Query cache
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("notes-synced"));
      }
    }
  } catch (error) {
    log.error("Background sync failed:", error);
  }
}

/**
 * Fetch note detail
 * Returns local data immediately if available, then syncs with server
 */
export async function fetchNote(noteId: string): Promise<Note | null> {
  log.debug("fetchNote called with noteId:", noteId);

  // 1. Check local data first
  const dbNote = await getNoteFromDB(noteId);
  log.debug("IndexedDB result:", dbNote ? "Found note" : "Note not found");
  
  const localNote = dbNote ? dbToNote(dbNote) : null;
  
  // 2. If not local, fetch from server immediately
  if (!localNote) {
    return await fetchNoteFromServer(noteId);
  }
  
  // Background sync if local data exists
  syncSingleNoteInBackground(noteId, localNote);
  
  return localNote;
}

/**
 * Fetch note from server (synchronous)
 */
async function fetchNoteFromServer(noteId: string): Promise<Note | null> {
  try {
    const url = await getNoteUrl(noteId);
    log.debug("Fetching from backend API:", url);

    const response = await halFetchUrl<NoteResource>(url, { method: "GET" });

    log.debug("Backend note data:", response);

    // Store links from note resource for future actions
    if (response._links) {
      storeResourceLinks("note", noteId, response);
    }

    const serverNote = apiToNote(response);
    
    // Save to IndexedDB
    const { noteToDb } = await import("../adapters/note.adapter");
    const { saveNote } = await import("@/lib/db/notes");
    const dbNote = noteToDb(serverNote);
    await saveNote(dbNote);
    
    return serverNote;
  } catch (error) {
    if (error instanceof HalError && error.status === 404) {
      log.debug("Note not found in backend (404)");
      return null;
    }
    log.error("Failed to fetch from server:", error);
    return null;
  }
}

/**
 * Background single note synchronization
 */
async function syncSingleNoteInBackground(
  noteId: string,
  localNote: Note
): Promise<void> {
  try {
    const url = await getNoteUrl(noteId);
    const response = await halFetchUrl<NoteResource>(url, { method: "GET" });

    const serverNote = apiToNote(response);

    // Update if server is newer
    if (serverNote.updatedAt > localNote.updatedAt) {
      const { saveNote } = await import("@/lib/db/notes");
      const { noteToDb } = await import("../adapters/note.adapter");
      const dbNote = noteToDb(serverNote);

      await saveNote(dbNote);

      log.info(`✅ Synced note from server: ${noteId}`);

      // Invalidate React Query cache
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("note-synced", { detail: { noteId } })
        );
      }
    }
  } catch (error) {
    log.error("Background sync failed:", error);
  }
}

/**
 * Create note
 * Saves to IndexedDB immediately, syncs to backend in background
 */
export async function createNote(
  title: string,
  folderId: string,
  files: File[],
  type: "student" | "educator" = "student"
): Promise<Note> {
  log.debug(`📝 Creating note with type: ${type}`);
  
  // Check for duplicate title
  const isDuplicate = await checkDuplicateNoteTitle(title, folderId);
  if (isDuplicate) {
    throw new Error(`이 폴더에 이미 같은 이름의 노트가 있습니다: "${title}"`);
  }

  let localResult: Note | null = null;
  let noteId: string | null = null;

  // 1. Save to IndexedDB immediately
  try {
    const { createNote: createNoteInDB } = await import("@/lib/db/notes");
    const { saveMultipleFiles } = await import("@/lib/db/files");

    const dbNote = await createNoteInDB(title, folderId, type);
    noteId = dbNote.id;

    if (files.length > 0) {
      await saveMultipleFiles(dbNote.id, files);
    }

    localResult = dbToNote(dbNote);
    log.debug(`Note saved to IndexedDB with ID: ${noteId}, type: ${type}`);
  } catch (error) {
    log.error("Failed to save to IndexedDB:", error);
  }

  // 2. Sync to backend
  const syncToBackend = async () => {
    try {
      const url = await getNotesUrl();
      const formData = new FormData();
      formData.append("id", noteId!);
      formData.append("title", title);
      formData.append("folder_id", folderId);
      formData.append("type", type);
      files.forEach((file) => formData.append("files", file));

      log.debug(`🔄 Syncing to backend:`, {
        url,
        noteId,
        title,
        folderId,
        type,
        filesCount: files.length,
      });

      const token = getAccessToken();
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      log.debug(`Backend response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errorText = await res.text();
        log.error(`Backend error response:`, errorText);
        throw new Error(
          `Failed to create note on backend: ${res.status} ${errorText}`
        );
      }

      const backendNote: NoteResource = await res.json();
      log.info(`✅ Note synced to backend:`, title, `ID: ${backendNote.id}`);

      // Store links from created note
      if (backendNote._links) {
        storeResourceLinks("note", backendNote.id, backendNote);
      }

      return backendNote;
    } catch (error) {
      log.error("Failed to sync to backend:", error);
      return null;
    }
  };

  // Start background sync
  syncToBackend();

  // Return local result immediately
  if (localResult) {
    return localResult;
  }

  // If IndexedDB failed, call API directly
  const url = await getNotesUrl();
  const formData = new FormData();
  formData.append("title", title);
  formData.append("folder_id", folderId);
  files.forEach((file) => formData.append("files", file));

  const token = getAccessToken();
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to create note");
  const apiNote: ApiNoteResponse = await res.json();
  return apiToNote(apiNote);
}

/**
 * Update note
 * Updates IndexedDB immediately, syncs to backend in background
 */
export async function updateNote(
  noteId: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>
): Promise<void> {
  // 1. Update IndexedDB immediately
  try {
    await updateNoteInDB(noteId, updates as any);
    log.debug(`Note updated in IndexedDB:`, noteId);
  } catch (error) {
    log.error("Failed to update in IndexedDB:", error);
  }

  // 2. Sync to backend
  const syncToBackend = async () => {
    const apiUpdates: any = {};
    if (updates.title !== undefined) apiUpdates.title = updates.title;
    if (updates.folderId !== undefined) apiUpdates.folder_id = updates.folderId;
    if (updates.thumbnail !== undefined) apiUpdates.thumbnail = updates.thumbnail;
    if (updates.updatedAt !== undefined) {
      apiUpdates.updated_at = new Date(updates.updatedAt).toISOString();
    }

    try {
      const url = await getNoteUrl(noteId);
      await halFetchUrl<NoteResource>(url, {
        method: "PATCH",
        body: JSON.stringify(apiUpdates),
      });
      log.info(`Note update synced to backend:`, noteId);
    } catch (error) {
      log.error("Failed to sync update to backend:", error);
    }
  };

  syncToBackend();
}

/**
 * Delete note
 * Deletes from IndexedDB immediately, syncs to backend in background
 */
export async function deleteNote(noteId: string): Promise<void> {
  // 1. Delete from IndexedDB immediately
  try {
    await deleteNoteInDB(noteId);
    log.debug(`Note deleted from IndexedDB:`, noteId);
  } catch (error) {
    log.error("Failed to delete from IndexedDB:", error);
  }

  // 2. Sync to backend
  const syncToBackend = async () => {
    try {
      const url = await getNoteUrl(noteId);
      await halFetchUrl<HalResource>(url, { method: "DELETE" });
      log.info(`Note deletion synced to backend:`, noteId);
    } catch (error) {
      log.error("Failed to sync deletion to backend:", error);
    }
  };

  syncToBackend();
}

/**
 * Save note content
 */
export async function saveNoteContent(
  noteId: string,
  pageId: string,
  blocks: any[]
): Promise<void> {
  if (USE_LOCAL) {
    await saveNoteContentInDB(noteId, pageId, blocks);
  } else {
    const url = await getNoteContentUrl(noteId);
    await halFetchUrl<HalResource>(url, {
      method: "POST",
      body: JSON.stringify({ pageId, blocks }),
    });
  }
}

/**
 * Fetch note content
 */
export async function fetchNoteContent(
  noteId: string,
  pageId: string
): Promise<any[] | null> {
  if (USE_LOCAL) {
    const content = await getNoteContentFromDB(noteId, pageId);
    return content?.blocks || null;
  } else {
    try {
      const url = `${await getNoteContentUrl(noteId)}/${pageId}`;
      const response = await halFetchUrl<HalResource & { blocks: any[] }>(url, {
        method: "GET",
    });
      return response.blocks;
    } catch (error) {
      if (error instanceof HalError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

/**
 * Trash API - Get all trashed notes
 */
export async function fetchTrashedNotes(): Promise<Note[]> {
  log.debug("🗑️ Fetching trashed notes");

  const url = await getTrashedNotesUrl();
  const response = await halFetchUrl<NotesListResource>(url, { method: "GET" });

  const apiNotes = Array.isArray(response) ? response : (response.items || response);
  log.info("✅ Fetched trashed notes:", apiNotes.length);

  return apiToNotes(apiNotes as ApiNoteResponse[]);
}

/**
 * Trash API - Restore a trashed note
 */
export async function restoreNote(
  noteId: string
): Promise<{ message: string; title?: string }> {
  log.debug("🔄 Restoring note:", noteId);

  const url = `${await getNoteUrl(noteId)}/restore`;
  const response = await halFetchUrl<HalResource & { message: string; title?: string }>(
    url,
    { method: "POST" }
  );

  log.info("✅ Note restored:", response);
  return response;
}

/**
 * Trash API - Permanently delete a trashed note
 */
export async function permanentlyDeleteNote(
  noteId: string
): Promise<{ message: string }> {
  log.debug("🗑️ Permanently deleting note:", noteId);

  const url = `${await getNoteUrl(noteId)}/permanent`;
  const response = await halFetchUrl<HalResource & { message: string }>(url, {
    method: "DELETE",
  });

  log.info("✅ Note permanently deleted:", response);
  return response;
}
