/**
 * 파일 업로드 API 엔드포인트
 *
 * NOTE: 현재는 Mock API를 사용합니다.
 * 백엔드 API가 준비되면 실제 API 호출로 대체할 수 있습니다.
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_FILES !== "false";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

/**
 * 단일 파일 업로드
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  if (USE_MOCK) {
    // Mock: 진행률 시뮬레이션
    return new Promise((resolve, reject) => {
      let loaded = 0;
      const total = file.size;
      const chunkSize = Math.max(total / 20, 1024); // 최소 1KB 청크

      const interval = setInterval(() => {
        // AbortSignal 체크
        if (signal?.aborted) {
          clearInterval(interval);
          reject(new Error("Upload cancelled"));
          return;
        }

        loaded = Math.min(loaded + chunkSize + Math.random() * chunkSize, total);
        const percentage = Math.floor((loaded / total) * 100);

        if (onProgress) {
          onProgress({ loaded, total, percentage });
        }

        if (loaded >= total) {
          clearInterval(interval);

          // 10% 확률로 에러 시뮬레이션
          if (Math.random() < 0.1) {
            reject(new Error("네트워크 오류: 업로드 실패"));
            return;
          }

          // Mock 업로드 결과
          const url = URL.createObjectURL(file);
          const result: UploadResult = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
          };

          resolve(result);
        }
      }, 200); // 200ms마다 진행률 업데이트
    });
  }

  // Real API 호출
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // AbortSignal 처리
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("Upload cancelled"));
      });
    }

    // 진행률 추적
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = Math.floor((event.loaded / event.total) * 100);
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage,
        });
      }
    });

    // 완료
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch (error) {
          reject(new Error("Invalid response format"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    // 에러
    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });

    // 요청 전송
    xhr.open("POST", "/api/files/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("authToken")}`);
    xhr.send(formData);
  });
}

/**
 * 여러 파일 업로드 (순차)
 */
export async function uploadFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void,
  signal?: AbortSignal
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const result = await uploadFile(
      file,
      (progress) => {
        if (onProgress) {
          onProgress(i, progress);
        }
      },
      signal
    );

    results.push(result);
  }

  return results;
}

/**
 * 여러 파일 업로드 (병렬)
 */
export async function uploadFilesParallel(
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void,
  maxConcurrent: number = 3
): Promise<UploadResult[]> {
  const results: (UploadResult | null)[] = new Array(files.length).fill(null);
  const uploadPromises: Promise<void>[] = [];
  let activeUploads = 0;
  let currentIndex = 0;

  const uploadNext = async (): Promise<void> => {
    if (currentIndex >= files.length) return;

    const index = currentIndex++;
    const file = files[index];

    activeUploads++;

    try {
      const result = await uploadFile(file, (progress) => {
        if (onProgress) {
          onProgress(index, progress);
        }
      });
      results[index] = result;
    } finally {
      activeUploads--;

      // 다음 파일 업로드
      if (currentIndex < files.length) {
        await uploadNext();
      }
    }
  };

  // 동시 업로드 시작
  for (let i = 0; i < Math.min(maxConcurrent, files.length); i++) {
    uploadPromises.push(uploadNext());
  }

  await Promise.all(uploadPromises);

  return results.filter((r): r is UploadResult => r !== null);
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileId: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  const response = await fetch(`/api/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete file");
  }
}
