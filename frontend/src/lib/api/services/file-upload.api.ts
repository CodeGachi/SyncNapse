/**
 * 파일 업로드 API 클라이언트
 *
 * 백엔드 서버로 파일을 업로드하고 영구 URL을 받아옵니다.
 * 엔드포인트: POST /api/notes/:noteId/files (multipart/form-data)
 */

import { createLogger } from "@/lib/utils/logger";
import { getAccessToken } from "@/lib/auth/token-manager";

const log = createLogger("FileUpload");

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface FileUploadResponse {
  id: string;
  noteId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  storageKey: string;
  version: number;
  isLatest: boolean;
  uploadedAt: string;
  // Legacy aliases for compatibility
  fileId?: string;
  fileUrl?: string;
}

/**
 * 인증 토큰 가져오기
 */
function getAuthToken(): string | null {
  return getAccessToken();
}

/**
 * 백엔드로 파일 업로드
 *
 * POST /api/notes/:noteId/files
 * - 파일을 MinIO/S3에 업로드
 * - storageUrl 반환
 */
export async function uploadFileToServer(
  file: File,
  noteId: string
): Promise<FileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    log.info(`백엔드로 업로드 시작: ${file.name}, noteId: ${noteId}`);

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/notes/${noteId}/files`, {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`파일 업로드 실패: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // 응답 정규화 (백엔드 응답을 FileUploadResponse 형태로)
    const result: FileUploadResponse = {
      id: data.id,
      noteId: data.noteId,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      storageUrl: data.storageUrl,
      storageKey: data.storageKey,
      version: data.version,
      isLatest: data.isLatest,
      uploadedAt: data.uploadedAt,
      // Legacy aliases
      fileId: data.id,
      fileUrl: data.storageUrl,
    };

    log.info(`백엔드 업로드 완료:`, {
      fileName: result.fileName,
      storageUrl: result.storageUrl,
    });

    return result;
  } catch (error) {
    log.error("백엔드 업로드 실패:", error);
    throw error;
  }
}

/**
 * 파일 다운로드 URL 가져오기 (선택사항)
 *
 * GET /api/files/:fileId
 * - Signed URL 생성 (보안)
 */
export async function getFileDownloadUrl(fileId: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/files/${fileId}`);

    if (!response.ok) {
      throw new Error(`파일 URL 가져오기 실패: ${response.status}`);
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    log.error("URL 가져오기 실패:", error);
    throw error;
  }
}
