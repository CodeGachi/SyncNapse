/**
 * FileList Hook
 * 파일 업로드 재시도 및 취소 로직 관리
 */

import type { useFileUpload } from "@/hooks/use-file-upload";

export function useFileList(uploadQueue: ReturnType<typeof useFileUpload>) {
  const handleRetry = (fileName: string, fileSize: number) => {
    const queueFile = uploadQueue.files.find(
      (qf) => qf.file.name === fileName && qf.file.size === fileSize
    );
    if (queueFile) {
      uploadQueue.retryFailed();
      uploadQueue.startUpload();
    }
  };

  const handleCancel = (fileName: string, fileSize: number) => {
    const queueFile = uploadQueue.files.find(
      (qf) => qf.file.name === fileName && qf.file.size === fileSize
    );
    if (queueFile) {
      uploadQueue.removeFile(queueFile.id);
    }
  };

  return {
    handleRetry,
    handleCancel,
  };
}
