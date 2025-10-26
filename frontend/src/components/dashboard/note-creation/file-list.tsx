/**
 * 업로드된 파일 목록 컴포넌트
 * 파일 상태 표시 및 관리 기능
 */

"use client";

import type { UploadedFile } from "@/lib/types";
import type { useFileUpload } from "@/hooks/use-file-upload";

interface FileListProps {
  uploadedFiles: UploadedFile[];
  uploadQueue: ReturnType<typeof useFileUpload>;
  onRemoveFile: (file: File) => void;
}

export function FileList({
  uploadedFiles,
  uploadQueue,
  onRemoveFile,
}: FileListProps) {
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

  return (
    <div className="flex-1 flex flex-col gap-3 bg-[#2F2F2F] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white">
        업로드된 파일 ({uploadedFiles.length}개)
      </h3>
      <div className="flex flex-col gap-2 overflow-y-auto flex-1">
        {uploadedFiles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            업로드된 파일이 없습니다
          </div>
        ) : (
          uploadedFiles.map((uf, index) => (
            <div
              key={index}
              className="rounded-lg p-4 flex justify-between items-center transition-colors bg-[#575757] hover:bg-[#6A6A6A]"
            >
              <div className="flex items-center gap-4">
                {/* 파일 아이콘 */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 2L6 18M6 2L14 2L18 6L18 18L6 18"
                    stroke={
                      uf.status === "completed"
                        ? "#22C55E"
                        : uf.status === "error"
                        ? "#EF4444"
                        : uf.status === "uploading"
                        ? "#3B82F6"
                        : "#9CA3AF"
                    }
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div>
                  <p className="text-sm font-medium text-white truncate max-w-[200px]">
                    {uf.file.name}
                  </p>
                  <p className="text-xs text-[#B9B9B9]">
                    {(uf.file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  {uf.error && (
                    <p className="text-xs text-red-400 mt-1">{uf.error}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 상태별 UI - 완료 또는 실패만 표시 */}
                {uf.status === "completed" ? (
                  <span className="text-xs font-medium text-[#16A34A]">
                    완료
                  </span>
                ) : uf.status === "error" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRetry(uf.file.name, uf.file.size);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    재시도
                  </button>
                ) : null}

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(uf.file);
                    handleCancel(uf.file.name, uf.file.size);
                  }}
                  className="text-[#EF4444] hover:text-[#DC2626]"
                  title="목록에서 제거"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 1L13 13M13 1L1 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
