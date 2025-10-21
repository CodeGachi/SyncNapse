/**
 * 검색 API 엔드포인트
 */

import type { Note, Folder, Tag } from "@/lib/types";
import { fetchNotes } from "./notes.api";
import { fetchFolders } from "./folders.api";
import { fetchTags } from "./tags.api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_SEARCH !== "false";

export interface SearchResult {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  totalCount: number;
}

/**
 * 통합 검색
 */
export async function searchAll(query: string): Promise<SearchResult> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const lowerQuery = query.toLowerCase();

    // 병렬로 모든 데이터 조회
    const [allNotes, allFolders, allTags] = await Promise.all([
      fetchNotes(),
      fetchFolders(),
      fetchTags(),
    ]);

    // 검색 필터링
    const notes = allNotes.filter((note) =>
      note.title.toLowerCase().includes(lowerQuery)
    );

    const folders = allFolders.filter((folder) =>
      folder.name.toLowerCase().includes(lowerQuery)
    );

    const tags = allTags.filter((tag) =>
      tag.name.toLowerCase().includes(lowerQuery)
    );

    return {
      notes,
      folders,
      tags,
      totalCount: notes.length + folders.length + tags.length,
    };
  }

  // Real API
  const response = await fetch(
    `/api/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Search failed");
  }

  return response.json();
}

/**
 * 노트만 검색
 */
export async function searchNotes(query: string): Promise<Note[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const lowerQuery = query.toLowerCase();
    const allNotes = await fetchNotes();

    return allNotes.filter((note) =>
      note.title.toLowerCase().includes(lowerQuery)
    );
  }

  const response = await fetch(
    `/api/search/notes?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Note search failed");
  }

  return response.json();
}

/**
 * 대시보드 통계
 */
export interface DashboardStats {
  totalNotes: number;
  totalFolders: number;
  totalTags: number;
  recentNotes: Note[];
  popularTags: Tag[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const [notes, folders, tags] = await Promise.all([
      fetchNotes(),
      fetchFolders(),
      fetchTags(),
    ]);

    // 최근 노트 (최대 5개)
    const recentNotes = notes
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5);

    // 인기 태그 (Mock에서는 전체 태그)
    const popularTags = tags.slice(0, 5);

    return {
      totalNotes: notes.length,
      totalFolders: folders.length,
      totalTags: tags.length,
      recentNotes,
      popularTags,
    };
  }

  const response = await fetch("/api/dashboard/stats", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }

  return response.json();
}
