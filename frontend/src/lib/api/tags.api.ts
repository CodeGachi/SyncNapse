/**
 * 태그 API 엔드포인트
 */

import type { Tag } from "@/lib/types";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_TAGS !== "false";

// Mock 데이터
let mockTagsStore: Tag[] = [];

function initializeMockTags() {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem("tags");
  if (stored) {
    try {
      mockTagsStore = JSON.parse(stored);
      return;
    } catch (error) {
      console.error("Failed to parse stored tags:", error);
    }
  }

  mockTagsStore = [
    { id: "tag1", name: "프론트엔드", color: "#3B82F6" },
    { id: "tag2", name: "백엔드", color: "#10B981" },
    { id: "tag3", name: "데이터베이스", color: "#F59E0B" },
    { id: "tag4", name: "DevOps", color: "#EF4444" },
  ];

  localStorage.setItem("tags", JSON.stringify(mockTagsStore));
}

if (typeof window !== "undefined") {
  initializeMockTags();
}

/**
 * 모든 태그 조회
 */
export async function fetchTags(): Promise<Tag[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tags");
      if (stored) {
        mockTagsStore = JSON.parse(stored);
      }
    }

    return mockTagsStore;
  }

  const response = await fetch("/api/tags", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }

  return response.json();
}

/**
 * ID로 태그 조회
 */
export async function fetchTagById(tagId: string): Promise<Tag> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tags");
      if (stored) {
        mockTagsStore = JSON.parse(stored);
      }
    }

    const tag = mockTagsStore.find((t) => t.id === tagId);
    if (!tag) {
      throw new Error(`Tag not found: ${tagId}`);
    }
    return tag;
  }

  const response = await fetch(`/api/tags/${tagId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tag");
  }

  return response.json();
}

/**
 * 태그 생성
 */
export async function createTagApi(data: {
  name: string;
  color?: string;
}): Promise<Tag> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      color: data.color || "#6B7280",
    };

    mockTagsStore.push(newTag);

    if (typeof window !== "undefined") {
      localStorage.setItem("tags", JSON.stringify(mockTagsStore));
    }

    return newTag;
  }

  const response = await fetch("/api/tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create tag");
  }

  return response.json();
}

/**
 * 태그 수정
 */
export async function updateTagApi(
  tagId: string,
  updates: Partial<Omit<Tag, "id">>
): Promise<Tag> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tags");
      if (stored) {
        mockTagsStore = JSON.parse(stored);
      }
    }

    const tagIndex = mockTagsStore.findIndex((t) => t.id === tagId);
    if (tagIndex === -1) {
      throw new Error(`Tag not found: ${tagId}`);
    }

    mockTagsStore[tagIndex] = {
      ...mockTagsStore[tagIndex],
      ...updates,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("tags", JSON.stringify(mockTagsStore));
    }

    return mockTagsStore[tagIndex];
  }

  const response = await fetch(`/api/tags/${tagId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update tag");
  }

  return response.json();
}

/**
 * 태그 삭제
 */
export async function deleteTagApi(tagId: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tags");
      if (stored) {
        mockTagsStore = JSON.parse(stored);
      }
    }

    const initialLength = mockTagsStore.length;
    mockTagsStore = mockTagsStore.filter((t) => t.id !== tagId);

    if (mockTagsStore.length === initialLength) {
      throw new Error(`Tag not found: ${tagId}`);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("tags", JSON.stringify(mockTagsStore));
    }

    return;
  }

  const response = await fetch(`/api/tags/${tagId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete tag");
  }
}
