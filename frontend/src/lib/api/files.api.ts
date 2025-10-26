/**
 * 파일 업로드 API 엔드포인트
 *
 * NOTE: 현재는 Mock API를 사용합니다.
 * 백엔드 API가 준비되면 실제 API 호출로 대체할 수 있습니다.
 */

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_FILES !== "false";

export interface UploadResult {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface FileUploadResult {
  file: File;
  result?: UploadResult;
  error?: Error;
  success: boolean;
}

export async function uploadFile(
  file: File,
  signal?: AbortSignal
): Promise<UploadResult> {
  if (USE_MOCK) {
    // Mock 업로드
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // AbortSignal 체크
        if (signal?.aborted) {
          reject(new Error("Upload cancelled"));
          return;
        }

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
      }, 1000 + Math.random() * 1000); // 1-2초 지연

      // AbortSignal 처리
      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Upload cancelled"));
        });
      }
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
 * 여러 파일 업로드 (병렬)
 *
 * @returns 각 파일의 업로드 결과 (성공/실패 정보 포함)
 */
export async function uploadFilesParallel(
  files: File[],
  maxConcurrent: number = 3
): Promise<FileUploadResult[]> {
  const results: FileUploadResult[] = new Array(files.length);
  const uploadPromises: Promise<void>[] = [];
  let currentIndex = 0;

  const uploadNext = async (): Promise<void> => {
    if (currentIndex >= files.length) return;

    const index = currentIndex++;
    const file = files[index];

    try {
      const result = await uploadFile(file);
      results[index] = {
        file,
        result,
        success: true,
      };
    } catch (error) {
      results[index] = {
        file,
        error: error instanceof Error ? error : new Error(String(error)),
        success: false,
      };
    } finally {
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

  return results;
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
