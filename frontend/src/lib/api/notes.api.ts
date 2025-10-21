/**
 * 노트 API 엔드포인트
 *
 * NOTE: 현재는 Mock API를 사용합니다.
 * 백엔드 API가 준비되면 실제 API 호출로 대체할 수 있습니다.
 */

import type { Note, NoteData, NoteFile } from "@/lib/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_NOTES !== "false";

// Mock 데이터 저장소
let mockNotesStore: Note[] = [];

// 초기 더미 데이터
function initializeMockNotes() {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem("notes");
  if (stored) {
    try {
      mockNotesStore = JSON.parse(stored);
      return;
    } catch (error) {
      console.error("Failed to parse stored notes:", error);
    }
  }

  // 더미 노트 생성
  mockNotesStore = [
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

  localStorage.setItem("notes", JSON.stringify(mockNotesStore));
}

// 초기화
if (typeof window !== "undefined") {
  initializeMockNotes();
}

/**
 * 모든 노트 조회
 */
export async function fetchNotes(): Promise<Note[]> {
  if (USE_MOCK) {
    // Mock: localStorage에서 노트 로드
    await new Promise((resolve) => setTimeout(resolve, 300)); // 네트워크 지연 시뮬레이션

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notes");
      if (stored) {
        mockNotesStore = JSON.parse(stored);
      }
    }

    return mockNotesStore;
  }

  // Real API 호출 (추후 구현)
  const response = await fetch("/api/notes", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notes");
  }

  return response.json();
}

/**
 * ID로 노트 조회
 */
export async function fetchNoteById(noteId: string): Promise<Note> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notes");
      if (stored) {
        mockNotesStore = JSON.parse(stored);
      }
    }

    const note = mockNotesStore.find((n) => n.id === noteId);
    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }
    return note;
  }

  const response = await fetch(`/api/notes/${noteId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch note");
  }

  return response.json();
}

/**
 * 노트 생성
 */
export async function createNoteApi(noteData: NoteData): Promise<Note> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const noteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // File 객체를 NoteFile로 변환
    const noteFiles: NoteFile[] = noteData.files.map((file, index) => {
      const url = file instanceof File ? URL.createObjectURL(file) : undefined;

      return {
        id: `file-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url,
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

    mockNotesStore.push(newNote);

    if (typeof window !== "undefined") {
      localStorage.setItem("notes", JSON.stringify(mockNotesStore));
    }

    return newNote;
  }

  // Real API 호출
  const formData = new FormData();
  formData.append("title", noteData.title);
  formData.append("location", noteData.location);
  noteData.files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch("/api/notes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to create note");
  }

  return response.json();
}

/**
 * 노트 수정
 */
export async function updateNoteApi(
  noteId: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>
): Promise<Note> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notes");
      if (stored) {
        mockNotesStore = JSON.parse(stored);
      }
    }

    const noteIndex = mockNotesStore.findIndex((n) => n.id === noteId);
    if (noteIndex === -1) {
      throw new Error(`Note not found: ${noteId}`);
    }

    mockNotesStore[noteIndex] = {
      ...mockNotesStore[noteIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("notes", JSON.stringify(mockNotesStore));
    }

    return mockNotesStore[noteIndex];
  }

  const response = await fetch(`/api/notes/${noteId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update note");
  }

  return response.json();
}

/**
 * 노트 삭제
 */
export async function deleteNoteApi(noteId: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notes");
      if (stored) {
        mockNotesStore = JSON.parse(stored);
      }
    }

    const initialLength = mockNotesStore.length;
    mockNotesStore = mockNotesStore.filter((n) => n.id !== noteId);

    if (mockNotesStore.length === initialLength) {
      throw new Error(`Note not found: ${noteId}`);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("notes", JSON.stringify(mockNotesStore));
    }

    return;
  }

  const response = await fetch(`/api/notes/${noteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete note");
  }
}
