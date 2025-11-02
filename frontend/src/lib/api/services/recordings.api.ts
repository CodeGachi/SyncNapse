/**
* Records API - Backendand IndexedDB abstraction */ import type { DBRecording } from "@/lib/db/recordings";import {
  saveRecording as saveRecordingInDB,
  getRecordingsByNote as getRecordingsByNoteFromDB,
  getRecording as getRecordingFromDB,
  deleteRecording as deleteRecordingInDB,
  renameRecording as renameRecordingInDB,
} from "@/lib/db/recordings";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * Note all Record Import */ export async function fetchRecordingsByNote(  noteId: string
): Promise<DBRecording[]> {
  if (USE_LOCAL) {
    return await getRecordingsByNoteFromDB(noteId);
  } else {
    // Backend API Call const res = await fetch(`/api/notes/${noteId}/records`); if (!res.ok) throw new Error("Failed to fetch recordings");     return await res.json();
  }
}

/**
 * Record Save */ export async function saveRecording(  noteId: string,
  name: string,
  recordingBlob: Blob,
  duration: number
): Promise<DBRecording> {
  if (USE_LOCAL) {
    return await saveRecordingInDB(noteId, name, recordingBlob, duration);
  } else {
    // Backend API Call const formData = new FormData(); formData.append("name", name);     formData.append("recording", recordingBlob);
    formData.append("duration", duration.toString());

    const res = await fetch(`/api/notes/${noteId}/recordings`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to save recording");
    return await res.json();
  }
}

/**
 * Record Delete */ export async function deleteRecording(recordingId: string): Promise<void> {   if (USE_LOCAL) {
    await deleteRecordingInDB(recordingId);
  } else {
    // Backend API Call const res = await fetch(`/api/records/${recordId}`, { method: "DELETE",     });

    if (!res.ok) throw new Error("Failed to delete recording");
  }
}

/**
 * Record Name Change */ export async function renameRecording(  recordingId: string,
  newName: string
): Promise<void> {
  if (USE_LOCAL) {
    await renameRecordingInDB(recordingId, newName);
  } else {
    // Backend API Call const res = await fetch(`/api/records/${recordId}`, { method: "PATCH",       headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) throw new Error("Failed to rename recording");
  }
}
