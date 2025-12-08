/**
 * Drawings API Service
 *
 * 드로잉 데이터를 백엔드에 저장/로드하는 API 서비스
 *
 * 데이터 흐름:
 * - 불러오기: 백엔드 → IndexedDB → 뷰
 * - 저장하기: 드로잉 → IndexedDB → 백엔드
 */

import { createLogger } from "@/lib/utils/logger";
import type { DrawingData } from "@/lib/types/drawing";
import { getAccessToken } from "@/lib/auth/token-manager";
import { getApiBaseUrl } from "../hal";

const log = createLogger("DrawingsAPI");

// ==========================================
// API Types
// ==========================================

/** 백엔드 드로잉 응답 형식 */
interface ApiDrawingResponse {
  id: string;
  note_id: string;
  page_num: number;
  canvas_data: {
    version: string;
    objects: any[];
    background: string;
    width?: number;
    height?: number;
  };
  image_data?: string;  // base64
  created_at: string;
  updated_at: string;
}

/** 백엔드 드로잉 저장 요청 */
interface SaveDrawingRequest {
  page_num: number;
  canvas_data: {
    version: string;
    objects: any[];
    background: string;
    width?: number;
    height?: number;
  };
  image_data?: string;  // base64 (optional, 용량 최적화)
}

// ==========================================
// URL Builders
// ==========================================

function getDrawingsUrl(noteId: string): string {
  return `${getApiBaseUrl()}/notes/${noteId}/drawings`;
}

function getDrawingUrl(noteId: string, pageNum: number): string {
  return `${getApiBaseUrl()}/notes/${noteId}/drawings/${pageNum}`;
}

// ==========================================
// Adapters
// ==========================================

/** API 응답 → DrawingData 변환 */
function apiToDrawing(api: ApiDrawingResponse): DrawingData {
  return {
    id: `${api.note_id}-${api.page_num}`,
    noteId: api.note_id,
    pageNum: api.page_num,
    canvas: {
      version: api.canvas_data.version || "6.0.0",
      objects: api.canvas_data.objects || [],
      background: api.canvas_data.background || "transparent",
      width: api.canvas_data.width || 0,
      height: api.canvas_data.height || 0,
    },
    image: api.image_data || "",
    createdAt: new Date(api.created_at).getTime(),
    updatedAt: new Date(api.updated_at).getTime(),
  };
}

/** DrawingData → API 요청 변환 */
function drawingToApi(drawing: DrawingData): SaveDrawingRequest {
  return {
    page_num: drawing.pageNum,
    canvas_data: {
      version: drawing.canvas.version,
      objects: drawing.canvas.objects,
      background: drawing.canvas.background,
      width: drawing.canvas.width,
      height: drawing.canvas.height,
    },
    // image_data는 용량이 크므로 선택적으로 전송
    // image_data: drawing.image,
  };
}

// ==========================================
// API Functions
// ==========================================

/**
 * 특정 노트의 모든 드로잉 가져오기 (백엔드)
 */
export async function fetchDrawingsByNote(noteId: string): Promise<DrawingData[]> {
  try {
    const url = getDrawingsUrl(noteId);
    log.debug(`📥 Fetching drawings from backend: ${url}`);

    const token = getAccessToken();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 404) {
        log.debug("No drawings found for note:", noteId);
        return [];
      }
      throw new Error(`Failed to fetch drawings: ${response.status}`);
    }

    const data = await response.json();

    // HAL 형식 지원
    const items: ApiDrawingResponse[] = Array.isArray(data)
      ? data
      : (data.items || data.drawings || []);

    log.info(`✅ Fetched ${items.length} drawings from backend`);
    return items.map(apiToDrawing);
  } catch (error) {
    log.error("Failed to fetch drawings from backend:", error);
    return [];
  }
}

/**
 * 특정 페이지의 드로잉 가져오기 (백엔드)
 */
export async function fetchDrawing(
  noteId: string,
  pageNum: number
): Promise<DrawingData | null> {
  try {
    const url = getDrawingUrl(noteId, pageNum);
    log.debug(`📥 Fetching drawing from backend: ${url}`);

    const token = getAccessToken();
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 404) {
        log.debug("Drawing not found:", { noteId, pageNum });
        return null;
      }
      throw new Error(`Failed to fetch drawing: ${response.status}`);
    }

    const data: ApiDrawingResponse = await response.json();
    log.info(`✅ Fetched drawing from backend: page ${pageNum}`);
    return apiToDrawing(data);
  } catch (error) {
    log.error("Failed to fetch drawing from backend:", error);
    return null;
  }
}

/**
 * 드로잉 저장 (백엔드)
 * IndexedDB 저장 후 백그라운드에서 호출
 */
export async function saveDrawingToBackend(drawing: DrawingData): Promise<boolean> {
  try {
    const url = getDrawingUrl(drawing.noteId, drawing.pageNum);
    log.debug(`📤 Saving drawing to backend: ${url}`, {
      pageNum: drawing.pageNum,
      objectCount: drawing.canvas.objects?.length || 0,
    });

    const token = getAccessToken();
    const body = drawingToApi(drawing);

    const response = await fetch(url, {
      method: "PUT",  // Upsert - 있으면 업데이트, 없으면 생성
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save drawing: ${response.status} - ${errorText}`);
    }

    log.info(`✅ Drawing saved to backend: page ${drawing.pageNum}`);
    return true;
  } catch (error) {
    log.error("Failed to save drawing to backend:", error);
    return false;
  }
}

/**
 * 드로잉 삭제 (백엔드)
 */
export async function deleteDrawingFromBackend(
  noteId: string,
  pageNum: number
): Promise<boolean> {
  try {
    const url = getDrawingUrl(noteId, pageNum);
    log.debug(`🗑️ Deleting drawing from backend: ${url}`);

    const token = getAccessToken();
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete drawing: ${response.status}`);
    }

    log.info(`✅ Drawing deleted from backend: page ${pageNum}`);
    return true;
  } catch (error) {
    log.error("Failed to delete drawing from backend:", error);
    return false;
  }
}

/**
 * 노트의 모든 드로잉 삭제 (백엔드)
 */
export async function deleteDrawingsByNoteFromBackend(noteId: string): Promise<boolean> {
  try {
    const url = getDrawingsUrl(noteId);
    log.debug(`🗑️ Deleting all drawings from backend: ${url}`);

    const token = getAccessToken();
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete drawings: ${response.status}`);
    }

    log.info(`✅ All drawings deleted from backend for note: ${noteId}`);
    return true;
  } catch (error) {
    log.error("Failed to delete drawings from backend:", error);
    return false;
  }
}

// ==========================================
// Sync Functions
// ==========================================

/**
 * 백엔드에서 드로잉을 가져와 IndexedDB에 저장
 * 초기 로드 시 사용
 */
export async function syncDrawingsFromBackend(noteId: string): Promise<DrawingData[]> {
  const { saveDrawing } = await import("@/lib/db/drawings");

  const backendDrawings = await fetchDrawingsByNote(noteId);

  if (backendDrawings.length === 0) {
    log.debug("No drawings to sync from backend");
    return [];
  }

  // IndexedDB에 저장
  for (const drawing of backendDrawings) {
    await saveDrawing(drawing);
  }

  log.info(`✅ Synced ${backendDrawings.length} drawings from backend to IndexedDB`);
  return backendDrawings;
}

/**
 * IndexedDB의 드로잉을 백엔드에 동기화
 * 저장 시 백그라운드에서 사용
 */
export async function syncDrawingToBackend(drawing: DrawingData): Promise<void> {
  // 백그라운드에서 실행 (UI 블로킹 없음)
  saveDrawingToBackend(drawing).then((success) => {
    if (!success) {
      log.warn("Background sync to backend failed for drawing:", drawing.id);
    }
  });
}
