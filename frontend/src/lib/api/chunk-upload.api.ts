/**
 * 청크 업로드 API 클라이언트
 *
 * 대용량 파일(10MB 이상)을 청크 단위로 업로드합니다.
 * 백엔드 엔드포인트:
 * - POST /api/uploads/start
 * - POST /api/uploads/:id/chunk?index=N
 * - POST /api/uploads/:id/complete
 * - GET /api/uploads/:id/status
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** 청크 크기: 5MB */
export const CHUNK_SIZE = 5 * 1024 * 1024;

/** 대용량 파일 기준: 10MB */
export const CHUNK_THRESHOLD = 10 * 1024 * 1024;

export interface ChunkUploadOptions {
  /** 진행률 콜백 (0-100) */
  onProgress?: (percent: number) => void;
  /** 청크 완료 콜백 */
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  /** 취소 시그널 */
  signal?: AbortSignal;
}

export interface ChunkUploadResult {
  uploadId: string;
  storageKey: string;
  fileName: string;
}

export interface StartUploadResponse {
  id: string;
}

export interface CompleteUploadResponse {
  ok: boolean;
  storageKey: string;
}

export interface UploadStatus {
  id: string;
  fileName: string;
  mimeType: string | null;
  totalChunks: number;
  receivedChunks: number;
  totalSizeBytes: number | null;
  status: "RECEIVING" | "COMPLETED" | "FAILED";
  storageKey: string | null;
  completedAt: string | null;
}

/**
 * 인증 토큰 가져오기
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

/**
 * 인증 헤더 생성
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 청크 업로드 시작
 *
 * POST /api/uploads/start
 */
export async function startChunkedUpload(body: {
  fileName: string;
  mimeType?: string;
  totalChunks: number;
  totalSizeBytes?: number;
  checksumSha256?: string;
}): Promise<StartUploadResponse> {
  const response = await fetch(`${API_URL}/api/uploads/start`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`청크 업로드 시작 실패: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * 개별 청크 업로드
 *
 * POST /api/uploads/:id/chunk?index=N
 */
export async function uploadChunk(
  uploadId: string,
  index: number,
  chunk: Blob
): Promise<{ ok: boolean; receivedChunks: number }> {
  const formData = new FormData();
  formData.append("chunk", chunk);

  const response = await fetch(
    `${API_URL}/api/uploads/${uploadId}/chunk?index=${index}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`청크 업로드 실패 (index: ${index}): ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * 청크 업로드 완료 (조립)
 *
 * POST /api/uploads/:id/complete
 */
export async function completeChunkedUpload(
  uploadId: string
): Promise<CompleteUploadResponse> {
  const response = await fetch(`${API_URL}/api/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`청크 업로드 완료 실패: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * 업로드 상태 조회
 *
 * GET /api/uploads/:id/status
 */
export async function getUploadStatus(uploadId: string): Promise<UploadStatus> {
  const response = await fetch(`${API_URL}/api/uploads/${uploadId}/status`, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`업로드 상태 조회 실패: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * 대용량 파일 청크 업로드 (통합 함수)
 *
 * 파일을 청크로 분할하여 업로드하고 완료합니다.
 * 진행률 콜백과 취소 기능을 지원합니다.
 */
export async function uploadFileChunked(
  file: File,
  options?: ChunkUploadOptions
): Promise<ChunkUploadResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  console.log(`[청크 업로드] 시작: ${file.name}, 총 ${totalChunks}개 청크`);

  // 1. 업로드 시작
  const { id: uploadId } = await startChunkedUpload({
    fileName: file.name,
    mimeType: file.type || undefined,
    totalChunks,
    totalSizeBytes: file.size,
  });

  console.log(`[청크 업로드] 세션 생성: ${uploadId}`);

  // 2. 청크별 업로드
  for (let i = 0; i < totalChunks; i++) {
    // 취소 확인
    if (options?.signal?.aborted) {
      throw new Error("업로드가 취소되었습니다.");
    }

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await uploadChunk(uploadId, i, chunk);

    // 진행률 콜백
    const progress = ((i + 1) / totalChunks) * 100;
    options?.onProgress?.(progress);
    options?.onChunkComplete?.(i, totalChunks);

    console.log(`[청크 업로드] 청크 ${i + 1}/${totalChunks} 완료 (${progress.toFixed(1)}%)`);
  }

  // 3. 완료 (조립)
  const result = await completeChunkedUpload(uploadId);

  console.log(`[청크 업로드] 완료: ${file.name}, storageKey: ${result.storageKey}`);

  return {
    uploadId,
    storageKey: result.storageKey,
    fileName: file.name,
  };
}

/**
 * 청크 업로드 이어받기
 *
 * 이전에 중단된 업로드를 이어서 진행합니다.
 */
export async function resumeChunkedUpload(
  file: File,
  uploadId: string,
  options?: ChunkUploadOptions
): Promise<ChunkUploadResult> {
  // 1. 현재 상태 조회
  const status = await getUploadStatus(uploadId);

  if (status.status === "COMPLETED") {
    return {
      uploadId,
      storageKey: status.storageKey!,
      fileName: status.fileName,
    };
  }

  const totalChunks = status.totalChunks;
  const startFromChunk = status.receivedChunks;

  console.log(`[청크 업로드] 이어받기: ${file.name}, ${startFromChunk}/${totalChunks}부터 시작`);

  // 2. 남은 청크 업로드
  for (let i = startFromChunk; i < totalChunks; i++) {
    if (options?.signal?.aborted) {
      throw new Error("업로드가 취소되었습니다.");
    }

    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await uploadChunk(uploadId, i, chunk);

    const progress = ((i + 1) / totalChunks) * 100;
    options?.onProgress?.(progress);
    options?.onChunkComplete?.(i, totalChunks);
  }

  // 3. 완료
  const result = await completeChunkedUpload(uploadId);

  return {
    uploadId,
    storageKey: result.storageKey,
    fileName: file.name,
  };
}

/**
 * 파일이 대용량인지 확인
 */
export function isLargeFile(file: File): boolean {
  return file.size >= CHUNK_THRESHOLD;
}
