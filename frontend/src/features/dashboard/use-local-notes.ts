/**
 * 로컬 노트 관리 훅 (IndexedDB 기반)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAllNotes,
  getNotesByFolder,
  createNote,
  getNote,
  updateNote,
  deleteNote,
  type DBNote,
} from "@/lib/db/notes";
import {
  saveMultipleFiles,
  getFilesByNote,
  dbFileToFile,
  type DBFile,
} from "@/lib/db/files";
import {
  saveNoteContent,
  getNoteContent,
  getAllNoteContent,
  type DBNoteContent,
} from "@/lib/db/notes";
import {
  saveRecording,
  getRecordingsByNote,
  type DBRecording,
} from "@/lib/db/recordings";

export function useLocalNotes(folderId?: string) {
  const [notes, setNotes] = useState<DBNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 노트 목록 불러오기
  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const allNotes = folderId
        ? await getNotesByFolder(folderId)
        : await getAllNotes();

      // 최신순 정렬
      allNotes.sort((a, b) => b.updatedAt - a.updatedAt);

      setNotes(allNotes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "노트를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [folderId]);

  // 초기 로드
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // 노트 생성 (파일과 함께)
  const handleCreateNote = async (
    title: string,
    folderId: string,
    files: File[]
  ): Promise<DBNote> => {
    try {
      // 노트 생성
      const note = await createNote(title, folderId);

      // 파일 저장
      if (files.length > 0) {
        await saveMultipleFiles(note.id, files);
      }

      await loadNotes();
      return note;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "노트 생성에 실패했습니다."
      );
    }
  };

  // 노트 삭제
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      await loadNotes();
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "노트 삭제에 실패했습니다."
      );
    }
  };

  // 노트 업데이트
  const handleUpdateNote = async (
    noteId: string,
    updates: Partial<Omit<DBNote, "id" | "createdAt">>
  ) => {
    try {
      await updateNote(noteId, updates);
      await loadNotes();
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "노트 업데이트에 실패했습니다."
      );
    }
  };

  return {
    notes,
    isLoading,
    error,
    createNote: handleCreateNote,
    deleteNote: handleDeleteNote,
    updateNote: handleUpdateNote,
    reload: loadNotes,
  };
}

/**
 * 개별 노트 상세 정보 관리 훅
 */
export function useLocalNote(noteId: string | null) {
  const [note, setNote] = useState<DBNote | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [recordings, setRecordings] = useState<DBRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNoteData = useCallback(async () => {
    if (!noteId) return;

    try {
      setIsLoading(true);

      // 노트 정보 로드
      const noteData = await getNote(noteId);
      setNote(noteData || null);

      // 파일 목록 로드
      const dbFiles = await getFilesByNote(noteId);
      const fileObjects = dbFiles.map(dbFileToFile);
      setFiles(fileObjects);

      // 녹음본 목록 로드
      const recordingList = await getRecordingsByNote(noteId);
      setRecordings(recordingList);
    } catch (err) {
      // 로드 실패 처리
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      setFiles([]);
      setRecordings([]);
      setIsLoading(false);
      return;
    }

    loadNoteData();
  }, [noteId, loadNoteData]);

  // 노트 컨텐츠 저장
  const saveContent = async (pageId: string, blocks: any[]) => {
    if (!noteId) return;
    await saveNoteContent(noteId, pageId, blocks);
  };

  // 노트 컨텐츠 로드
  const loadContent = async (pageId: string): Promise<any[] | null> => {
    if (!noteId) return null;
    const content = await getNoteContent(noteId, pageId);
    return content?.blocks || null;
  };

  // 녹음본 저장
  const saveRecordingData = async (
    name: string,
    blob: Blob,
    duration: number
  ) => {
    if (!noteId) return;
    await saveRecording(noteId, name, blob, duration);
    await loadNoteData(); // 녹음본 목록 새로고침
  };

  return {
    note,
    files,
    recordings,
    isLoading,
    saveContent,
    loadContent,
    saveRecording: saveRecordingData,
    reload: loadNoteData,
  };
}
