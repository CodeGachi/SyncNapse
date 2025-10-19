/**
 * 업로드 큐 관리 훅
 */

import { useState, useCallback, useRef } from "react";
import type { UploadFile, UploadQueueOptions } from "@/lib/types";

export function useUploadQueue(options: UploadQueueOptions = {}) {
  const {
    maxConcurrent = 3,
    onFileComplete,
    onFileError,
    onQueueComplete,
    uploadFunction = defaultUploadFunction,
  } = options;

  const [queue, setQueue] = useState<UploadFile[]>([]);
  const [activeUploads, setActiveUploads] = useState<number>(0);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const addFiles = useCallback((files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: "pending" as const,
      totalBytes: file.size,
      uploadedBytes: 0,
    }));

    setQueue((prev) => [...prev, ...newUploadFiles]);
    return newUploadFiles;
  }, []);

  const removeFile = useCallback((fileId: string) => {
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);
    }

    setQueue((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateFile = useCallback((fileId: string, updates: Partial<UploadFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f)));
  }, []);

  const uploadFile = useCallback(
    async (uploadFile: UploadFile) => {
      const controller = new AbortController();
      abortControllersRef.current.set(uploadFile.id, controller);

      try {
        updateFile(uploadFile.id, {
          status: "uploading",
          startTime: Date.now(),
        });

        setActiveUploads((prev) => prev + 1);

        const onProgress = (progress: number) => {
          const uploadedBytes = Math.floor((progress / 100) * uploadFile.file.size);
          updateFile(uploadFile.id, {
            progress,
            uploadedBytes,
          });
        };

        await uploadFunction(uploadFile.file, onProgress);

        updateFile(uploadFile.id, {
          status: "completed",
          progress: 100,
          uploadedBytes: uploadFile.file.size,
          endTime: Date.now(),
        });

        const completedFile = queue.find((f) => f.id === uploadFile.id);
        if (completedFile && onFileComplete) {
          onFileComplete({ ...completedFile, status: "completed", progress: 100 });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          updateFile(uploadFile.id, {
            status: "cancelled",
            error: "업로드가 취소되었습니다.",
          });
        } else {
          const errorMessage = error instanceof Error ? error.message : "업로드 실패";
          updateFile(uploadFile.id, {
            status: "error",
            error: errorMessage,
          });

          const errorFile = queue.find((f) => f.id === uploadFile.id);
          if (errorFile && onFileError) {
            onFileError(
              { ...errorFile, status: "error", error: errorMessage },
              error instanceof Error ? error : new Error(errorMessage)
            );
          }
        }
      } finally {
        setActiveUploads((prev) => prev - 1);
        abortControllersRef.current.delete(uploadFile.id);
      }
    },
    [queue, updateFile, uploadFunction, onFileComplete, onFileError]
  );

  const processQueue = useCallback(() => {
    const pendingFiles = queue.filter((f) => f.status === "pending");

    if (pendingFiles.length === 0) {
      const hasActiveUploads = queue.some(
        (f) => f.status === "uploading" || f.status === "pending"
      );

      if (!hasActiveUploads && queue.length > 0 && onQueueComplete) {
        onQueueComplete();
      }
      return;
    }

    const availableSlots = maxConcurrent - activeUploads;
    const filesToUpload = pendingFiles.slice(0, availableSlots);

    filesToUpload.forEach((file) => {
      uploadFile(file);
    });
  }, [queue, activeUploads, maxConcurrent, uploadFile, onQueueComplete]);

  const startAll = useCallback(() => {
    processQueue();
  }, [processQueue]);

  const pauseAll = useCallback(() => {
    queue.forEach((file) => {
      if (file.status === "uploading") {
        const controller = abortControllersRef.current.get(file.id);
        if (controller) {
          controller.abort();
        }
        updateFile(file.id, { status: "pending" });
      }
    });
  }, [queue, updateFile]);

  const cancelAll = useCallback(() => {
    abortControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    abortControllersRef.current.clear();
    setQueue([]);
    setActiveUploads(0);
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue((prev) =>
      prev.filter(
        (f) =>
          f.status !== "completed" && f.status !== "error" && f.status !== "cancelled"
      )
    );
  }, []);

  const retryFile = useCallback(
    (fileId: string) => {
      updateFile(fileId, {
        status: "pending",
        progress: 0,
        error: undefined,
        uploadedBytes: 0,
      });
    },
    [updateFile]
  );

  const stats = {
    total: queue.length,
    pending: queue.filter((f) => f.status === "pending").length,
    uploading: queue.filter((f) => f.status === "uploading").length,
    completed: queue.filter((f) => f.status === "completed").length,
    error: queue.filter((f) => f.status === "error").length,
    cancelled: queue.filter((f) => f.status === "cancelled").length,
    totalProgress:
      queue.length > 0 ? queue.reduce((sum, f) => sum + f.progress, 0) / queue.length : 0,
  };

  return {
    queue,
    stats,
    activeUploads,
    addFiles,
    removeFile,
    updateFile,
    startAll,
    pauseAll,
    cancelAll,
    clearCompleted,
    retryFile,
    processQueue,
  };
}

async function defaultUploadFunction(
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;

      if (progress >= 100) {
        clearInterval(interval);
        onProgress(100);
        resolve();
      } else {
        onProgress(Math.min(progress, 100));
      }
    }, 200);

    if (Math.random() < 0.1) {
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error("네트워크 오류"));
      }, 1000);
    }
  });
}
