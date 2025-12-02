/**
 * 백엔드 → IndexedDB 동기화
 * 검색용 메타데이터를 백엔드에서 가져와 IndexedDB에 저장
 */

import { createLogger } from "@/lib/utils/logger";
import { getAccessToken } from "@/lib/auth/token-manager";
import {
  saveSearchNotes,
  saveSearchFiles,
  saveSearchSegments,
  saveSyncMeta,
  getSyncMeta,
  clearAllSearchData,
} from "./search";
import type {
  DBSearchNote,
  DBSearchFile,
  DBSearchSegment,
} from "./index";

const log = createLogger("SearchSync");

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ============================================
// API 응답 타입
// ============================================

interface ApiNote {
  id: string;
  title: string;
  type: "student" | "teacher";
  folder_id: string;
  updated_at: string;
}

interface ApiFile {
  id: string;
  fileName: string;
  noteId?: string;
  uploadedAt?: string;
  updatedAt?: string;
}

interface ApiSession {
  id: string;
  title: string;
  noteId: string | null;
  status: string;
  createdAt: string;
}

interface ApiSessionDetail {
  id: string;
  title: string;
  noteId: string | null;
  segments: ApiSegment[];
}

interface ApiSegment {
  id: string;
  text: string;
  startTime: string | number;
  endTime: string | number;
  confidence: string | number;
}

// ============================================
// 동기화 상태
// ============================================

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  progress: {
    notes: boolean;
    files: boolean;
    segments: boolean;
  };
}

// ============================================
// 동기화 함수
// ============================================

/**
 * 검색 데이터 전체 동기화
 * 대시보드 진입 시 호출
 */
export async function syncSearchData(): Promise<SyncStatus> {
  const token = getAccessToken();

  if (!token) {
    log.warn("No auth token, skipping search sync");
    return {
      isSyncing: false,
      lastSyncedAt: null,
      error: "No authentication token",
      progress: { notes: false, files: false, segments: false },
    };
  }

  log.info("Starting search data sync...");

  const status: SyncStatus = {
    isSyncing: true,
    lastSyncedAt: null,
    error: null,
    progress: { notes: false, files: false, segments: false },
  };

  try {
    // 1단계: 노트 + 세션 목록 (병렬)
    const [notes, sessions] = await Promise.all([
      fetchNotes(token),
      fetchSessions(token),
    ]);

    log.debug(`Fetched ${notes.length} notes, ${sessions.length} sessions`);

    // 2단계: 파일 + 세그먼트 (병렬)
    const [files, segments] = await Promise.all([
      fetchAllFiles(token, notes),
      fetchAllSegments(token, sessions, notes),
    ]);

    log.debug(`Fetched ${files.length} files, ${segments.length} segments`);

    // 3단계: IndexedDB에 저장 (기존 데이터 클리어 후)
    await clearAllSearchData();

    await Promise.all([
      saveSearchNotes(notes.map(apiNoteToSearchNote)),
      saveSearchFiles(files),
      saveSearchSegments(segments),
    ]);

    status.progress = { notes: true, files: true, segments: true };

    // 4단계: 동기화 메타데이터 저장
    const now = Date.now();
    await saveSyncMeta({
      id: "search",
      lastSyncedAt: now,
      version: 1,
    });

    status.lastSyncedAt = now;
    status.isSyncing = false;

    log.info(`Search sync completed: ${notes.length} notes, ${files.length} files, ${segments.length} segments`);

    return status;
  } catch (error) {
    log.error("Search sync failed:", error);
    status.isSyncing = false;
    status.error = error instanceof Error ? error.message : "Unknown error";
    return status;
  }
}

/**
 * 동기화 필요 여부 확인
 * 마지막 동기화 후 5분 이상 지났으면 true
 */
export async function needsSync(): Promise<boolean> {
  try {
    const meta = await getSyncMeta("search");
    if (!meta) return true;

    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - meta.lastSyncedAt > fiveMinutes;
  } catch {
    return true;
  }
}

// ============================================
// API 호출 함수
// ============================================

async function fetchNotes(token: string): Promise<ApiNote[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch notes: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    log.error("Failed to fetch notes:", error);
    return [];
  }
}

async function fetchSessions(token: string): Promise<ApiSession[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/transcription/sessions`, {
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch sessions: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    log.error("Failed to fetch sessions:", error);
    return [];
  }
}

/**
 * 모든 노트의 파일을 병렬로 가져오기
 */
async function fetchAllFiles(
  token: string,
  notes: ApiNote[]
): Promise<DBSearchFile[]> {
  const allFiles: DBSearchFile[] = [];

  // 병렬로 각 노트의 파일 가져오기
  const filePromises = notes.map(async (note) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notes/${note.id}/files`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        log.warn(`Failed to fetch files for note ${note.id}: ${res.status}`);
        return [];
      }

      const files: ApiFile[] = await res.json();
      return files.map((file) => apiFileToSearchFile(file, note));
    } catch (error) {
      log.error(`Failed to fetch files for note ${note.id}:`, error);
      return [];
    }
  });

  const results = await Promise.all(filePromises);
  results.forEach((files) => allFiles.push(...files));

  return allFiles;
}

/**
 * 모든 세션의 세그먼트를 병렬로 가져오기
 */
async function fetchAllSegments(
  token: string,
  sessions: ApiSession[],
  notes: ApiNote[]
): Promise<DBSearchSegment[]> {
  const allSegments: DBSearchSegment[] = [];

  // 노트 ID -> 제목 맵
  const noteTitleMap = new Map<string, string>();
  notes.forEach((note) => noteTitleMap.set(note.id, note.title));

  // 병렬로 각 세션의 세그먼트 가져오기
  const segmentPromises = sessions.map(async (session) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/transcription/sessions/${session.id}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        log.warn(`Failed to fetch session ${session.id}: ${res.status}`);
        return [];
      }

      const sessionDetail: ApiSessionDetail = await res.json();
      const noteTitle = session.noteId
        ? noteTitleMap.get(session.noteId) || ""
        : "";

      return sessionDetail.segments.map((segment) =>
        apiSegmentToSearchSegment(segment, session, noteTitle)
      );
    } catch (error) {
      log.error(`Failed to fetch session ${session.id}:`, error);
      return [];
    }
  });

  const results = await Promise.all(segmentPromises);
  results.forEach((segments) => allSegments.push(...segments));

  return allSegments;
}

// ============================================
// 변환 함수
// ============================================

function apiNoteToSearchNote(note: ApiNote): DBSearchNote {
  return {
    id: note.id,
    title: note.title,
    type: note.type === "teacher" ? "educator" : "student",
    folderId: note.folder_id,
    updatedAt: new Date(note.updated_at).getTime(),
  };
}

function apiFileToSearchFile(file: ApiFile, note: ApiNote): DBSearchFile {
  return {
    id: file.id,
    fileName: file.fileName,
    noteId: note.id,
    noteTitle: note.title,
    updatedAt: new Date(file.uploadedAt || file.updatedAt || Date.now()).getTime(),
  };
}

function apiSegmentToSearchSegment(
  segment: ApiSegment,
  session: ApiSession,
  noteTitle: string
): DBSearchSegment {
  return {
    id: segment.id,
    text: segment.text,
    startTime: typeof segment.startTime === "string"
      ? parseFloat(segment.startTime)
      : segment.startTime,
    endTime: typeof segment.endTime === "string"
      ? parseFloat(segment.endTime)
      : segment.endTime,
    sessionId: session.id,
    sessionTitle: session.title,
    noteId: session.noteId || "",
    noteTitle: noteTitle,
    confidence: typeof segment.confidence === "string"
      ? parseFloat(segment.confidence)
      : segment.confidence,
  };
}
