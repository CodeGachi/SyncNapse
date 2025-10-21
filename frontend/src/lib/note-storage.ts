/**
 * 노트 데이터 저장소 (더미)
 *
 * @deprecated 이 파일은 더 이상 사용되지 않습니다.
 * 대신 TanStack Query를 사용하세요:
 *
 * - 노트 조회: import { useNotes, useNote } from "@/lib/api/queries/notes.queries"
 * - 노트 생성/수정/삭제: import { useCreateNote, useUpdateNote, useDeleteNote } from "@/lib/api/mutations/notes.mutations"
 *
 * 새로운 API는 자동 캐싱, 낙관적 업데이트, 에러 재시도를 지원합니다.
 */

import type { Note, NoteData, NoteFile } from "./types";

// 더미 노트 저장소 (인메모리)
let notesStore: Note[] = [];

/**
 * 노트 생성 (파일 URL 포함)
 */
export function createNote(noteData: NoteData): Note {
  const noteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // File 객체를 NoteFile로 변환
  const noteFiles: NoteFile[] = noteData.files.map((file, index) => {
    // Blob URL 생성
    const url = file instanceof File ? URL.createObjectURL(file) : undefined;

    return {
      id: `file-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url, // Blob URL 저장
    };
  });

  const newNote: Note = {
    id: noteId,
    title: noteData.title,
    location: noteData.location,
    files: noteFiles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  notesStore.push(newNote);

  // 로컬 스토리지에도 저장 (브라우저 새로고침 대비)
  // 주의: Blob URL은 세션 종료 시 무효화됨
  if (typeof window !== "undefined") {
    localStorage.setItem("notes", JSON.stringify(notesStore));
  }

  return newNote;
}

/**
 * ID로 노트 조회
 */
export function getNoteById(noteId: string): Note | null {
  // 로컬 스토리지에서 불러오기
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("notes");
    if (stored) {
      notesStore = JSON.parse(stored);
    }
  }

  return notesStore.find((note) => note.id === noteId) || null;
}

/**
 * 제목으로 노트 조회 (임시 - 제목이 고유하지 않을 수 있음)
 */
export function getNoteByTitle(title: string): Note | null {
  // 로컬 스토리지에서 불러오기
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("notes");
    if (stored) {
      notesStore = JSON.parse(stored);
    }
  }

  return notesStore.find((note) => note.title === title) || null;
}

/**
 * 모든 노트 조회
 */
export function getAllNotes(): Note[] {
  // 로컬 스토리지에서 불러오기
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("notes");
    if (stored) {
      notesStore = JSON.parse(stored);
    }
  }

  return notesStore;
}

/**
 * 노트 업데이트
 */
export function updateNote(noteId: string, updates: Partial<Note>): Note | null {
  const noteIndex = notesStore.findIndex((note) => note.id === noteId);

  if (noteIndex === -1) return null;

  notesStore[noteIndex] = {
    ...notesStore[noteIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // 로컬 스토리지 업데이트
  if (typeof window !== "undefined") {
    localStorage.setItem("notes", JSON.stringify(notesStore));
  }

  return notesStore[noteIndex];
}

/**
 * 노트 삭제
 */
export function deleteNote(noteId: string): boolean {
  const initialLength = notesStore.length;
  notesStore = notesStore.filter((note) => note.id !== noteId);

  if (notesStore.length < initialLength) {
    // 로컬 스토리지 업데이트
    if (typeof window !== "undefined") {
      localStorage.setItem("notes", JSON.stringify(notesStore));
    }
    return true;
  }

  return false;
}

/**
 * 더미 노트 초기화 (개발용)
 */
export function initializeDummyNotes() {
  const dummyNotes: Note[] = [
    {
      id: "note-1",
      title: "React 강의 노트",
      location: "folder1",
      files: [
        {
          id: "file-1",
          name: "강의자료.pdf",
          type: "application/pdf",
          size: 1024000,
        },
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "note-2",
      title: "TypeScript 기초",
      location: "root",
      files: [
        {
          id: "file-2",
          name: "typescript-basics.pdf",
          type: "application/pdf",
          size: 2048000,
        },
        {
          id: "file-3",
          name: "examples.ts",
          type: "text/typescript",
          size: 5000,
        },
      ],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  notesStore = dummyNotes;

  if (typeof window !== "undefined") {
    localStorage.setItem("notes", JSON.stringify(notesStore));
  }
}
