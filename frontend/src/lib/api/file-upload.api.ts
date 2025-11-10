/**
 * 파일 업로드 API 클라이언트
 *
 * 백엔드 서버로 파일을 업로드하고 영구 URL을 받아옵니다.
 * (현재는 준비용 코드 - 백엔드 구현 필요)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  fileUrl: string; // 영구 URL (예: https://cdn.syncnapse.com/files/...)
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

/**
 * 백엔드로 파일 업로드
 *
 * POST /api/files/upload
 * - 파일을 S3/Cloudflare R2에 업로드
 * - 영구 URL 반환
 */
export async function uploadFileToServer(
  file: File,
  noteId: string
): Promise<FileUploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("noteId", noteId);

    console.log(`[파일 업로드] 백엔드로 업로드 시작: ${file.name}`);

    const response = await fetch(`${API_URL}/api/files/upload`, {
      method: "POST",
      body: formData,
      credentials: "include", // 쿠키 포함 (CORS)
    });

    if (!response.ok) {
      throw new Error(`파일 업로드 실패: ${response.status} ${response.statusText}`);
    }

    const data: FileUploadResponse = await response.json();

    console.log(`[파일 업로드] 백엔드 업로드 완료:`, {
      fileName: data.fileName,
      fileUrl: data.fileUrl,
    });

    return data;
  } catch (error) {
    console.error("[파일 업로드] 백엔드 업로드 실패:", error);
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
    const response = await fetch(`${API_URL}/api/files/${fileId}`);

    if (!response.ok) {
      throw new Error(`파일 URL 가져오기 실패: ${response.status}`);
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error("[파일 다운로드] URL 가져오기 실패:", error);
    throw error;
  }
}
