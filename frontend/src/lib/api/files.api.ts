/**
 * File upload API endpoint
 *
 * NOTE: Currently uses a mock API.
 * When the backend API is ready, it can be replaced with real API calls.
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
    // Mock upload
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Check AbortSignal
        if (signal?.aborted) {
          reject(new Error("Upload cancelled"));
          return;
        }

        // Simulate error with 10% probability
        if (Math.random() < 0.1) {
          reject(new Error("네트워크 오류: 업로드 실패"));
          return;
        }

        // Mock upload result
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
      }, 1000 + Math.random() * 1000);

      // Handle AbortSignal
      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Upload cancelled"));
        });
      }
    });
  }

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // AbortSignal handling
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("Upload cancelled"));
      });
    }

    // Done
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

    // Error
    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });

    // Request send
    xhr.open("POST", "/api/files/upload");
    xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("authToken")}`);
    xhr.send(formData);
  });
}

/**
 * Upload multiple files (in parallel)
 *
 * @returns Upload results for each file (including success/failure information)
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
      // Upload next file
      if (currentIndex < files.length) {
        await uploadNext();
      }
    }
  };

  // Start concurrent uploads
  for (let i = 0; i < Math.min(maxConcurrent, files.length); i++) {
    uploadPromises.push(uploadNext());
  }

  await Promise.all(uploadPromises);

  return results;
}

/**
 * Delete file
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
