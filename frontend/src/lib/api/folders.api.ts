/**
 * 폴더 API 엔드포인트
 */

import type { Folder } from "@/lib/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_FOLDERS !== "false";

// Mock 데이터
let mockFoldersStore: Folder[] = [];

function initializeMockFolders() {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem("folders");
  if (stored) {
    try {
      mockFoldersStore = JSON.parse(stored);
      return;
    } catch (error) {
      console.error("Failed to parse stored folders:", error);
    }
  }

  mockFoldersStore = [
    { id: "folder1", name: "개인 프로젝트", noteCount: 5 },
    { id: "folder2", name: "강의 노트", noteCount: 12 },
    { id: "root", name: "루트", noteCount: 3 },
  ];

  localStorage.setItem("folders", JSON.stringify(mockFoldersStore));
}

if (typeof window !== "undefined") {
  initializeMockFolders();
}

/**
 * 모든 폴더 조회
 */
export async function fetchFolders(): Promise<Folder[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("folders");
      if (stored) {
        mockFoldersStore = JSON.parse(stored);
      }
    }

    return mockFoldersStore;
  }

  const response = await fetch("/api/folders", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch folders");
  }

  return response.json();
}

/**
 * ID로 폴더 조회
 */
export async function fetchFolderById(folderId: string): Promise<Folder> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("folders");
      if (stored) {
        mockFoldersStore = JSON.parse(stored);
      }
    }

    const folder = mockFoldersStore.find((f) => f.id === folderId);
    if (!folder) {
      throw new Error(`Folder not found: ${folderId}`);
    }
    return folder;
  }

  const response = await fetch(`/api/folders/${folderId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch folder");
  }

  return response.json();
}

/**
 * 폴더 생성
 */
export async function createFolderApi(name: string): Promise<Folder> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      noteCount: 0,
    };

    mockFoldersStore.push(newFolder);

    if (typeof window !== "undefined") {
      localStorage.setItem("folders", JSON.stringify(mockFoldersStore));
    }

    return newFolder;
  }

  const response = await fetch("/api/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error("Failed to create folder");
  }

  return response.json();
}

/**
 * 폴더 수정
 */
export async function updateFolderApi(
  folderId: string,
  updates: Partial<Omit<Folder, "id">>
): Promise<Folder> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 250));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("folders");
      if (stored) {
        mockFoldersStore = JSON.parse(stored);
      }
    }

    const folderIndex = mockFoldersStore.findIndex((f) => f.id === folderId);
    if (folderIndex === -1) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    mockFoldersStore[folderIndex] = {
      ...mockFoldersStore[folderIndex],
      ...updates,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("folders", JSON.stringify(mockFoldersStore));
    }

    return mockFoldersStore[folderIndex];
  }

  const response = await fetch(`/api/folders/${folderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update folder");
  }

  return response.json();
}

/**
 * 폴더 삭제
 */
export async function deleteFolderApi(folderId: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("folders");
      if (stored) {
        mockFoldersStore = JSON.parse(stored);
      }
    }

    const initialLength = mockFoldersStore.length;
    mockFoldersStore = mockFoldersStore.filter((f) => f.id !== folderId);

    if (mockFoldersStore.length === initialLength) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("folders", JSON.stringify(mockFoldersStore));
    }

    return;
  }

  const response = await fetch(`/api/folders/${folderId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete folder");
  }
}
