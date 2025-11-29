/**
 * 공통 파일 업로드 아이템 컴포넌트
 * - wide: 노트 생성 페이지용 (넓은 공간)
 * - compact: 파일 패널용 (좁은 공간)
 */

"use client";

import { FileText, RefreshCw, X, Check, AlertCircle, Loader2 } from "lucide-react";

export interface FileUploadItemProps {
  fileName: string;
  fileSize: number;
  status: "pending" | "uploading" | "completed" | "error" | "cancelled";
  progress: number;
  variant: "wide" | "compact";
  uploadStrategy?: "direct" | "chunked";
  error?: string;
  onRemove?: () => void;
  onRetry?: () => void;
}

/**
 * 파일 크기 포맷팅
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 상태 아이콘 컴포넌트
 */
function StatusIcon({ status }: { status: FileUploadItemProps["status"] }) {
  switch (status) {
    case "pending":
      return <Loader2 size={14} className="text-gray-400" />;
    case "uploading":
      return <Loader2 size={14} className="text-blue-400 animate-spin" />;
    case "completed":
      return <Check size={14} className="text-green-500" />;
    case "error":
      return <AlertCircle size={14} className="text-red-400" />;
    case "cancelled":
      return <X size={14} className="text-gray-500" />;
  }
}

/**
 * 상태 색상
 */
function getStatusColor(status: FileUploadItemProps["status"]): string {
  switch (status) {
    case "pending":
      return "#9CA3AF"; // gray-400
    case "uploading":
      return "#3B82F6"; // blue-500
    case "completed":
      return "#22C55E"; // green-500
    case "error":
      return "#EF4444"; // red-500
    case "cancelled":
      return "#6B7280"; // gray-500
  }
}

/**
 * Wide 레이아웃 (노트 생성용)
 * ┌────────────────────────────────────────────────┐
 * │ 📄 large-video.mp4    50.2 MB   ████░░ 67%    │
 * └────────────────────────────────────────────────┘
 */
function WideLayout({
  fileName,
  fileSize,
  status,
  progress,
  error,
  onRemove,
  onRetry,
}: FileUploadItemProps) {
  return (
    <div className="rounded-lg p-4 flex justify-between items-center transition-colors bg-[#575757] hover:bg-[#6A6A6A]">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* 파일 아이콘 */}
        <FileText size={20} stroke={getStatusColor(status)} />

        {/* 파일 정보 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{fileName}</p>
          <p className="text-xs text-[#B9B9B9]">{formatFileSize(fileSize)}</p>
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 진행률 또는 상태 */}
        {status === "uploading" ? (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-blue-400 w-10 text-right">{progress}%</span>
          </div>
        ) : status === "completed" ? (
          <span className="text-xs font-medium text-green-500">완료</span>
        ) : status === "error" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            재시도
          </button>
        ) : (
          <span className="text-xs text-gray-400">대기</span>
        )}

        {/* 삭제 버튼 */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="삭제"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact 레이아웃 (파일 패널용)
 * ┌──────────────────────┐
 * │ 📄 large-vid...  67% │
 * └──────────────────────┘
 */
function CompactLayout({
  fileName,
  fileSize,
  status,
  progress,
  error,
  onRemove,
  onRetry,
}: FileUploadItemProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md transition-all hover:bg-white/5 group">
      {/* 파일 아이콘 + 이름 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText size={14} className="flex-shrink-0" stroke={getStatusColor(status)} />
        <span className="text-xs text-gray-300 truncate flex-1" title={fileName}>
          {fileName}
        </span>
      </div>

      {/* 상태 표시 */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {status === "uploading" ? (
          <span className="text-xs text-blue-400">{progress}%</span>
        ) : status === "completed" ? (
          <StatusIcon status={status} />
        ) : status === "error" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.();
            }}
            className="text-red-400 hover:text-red-300"
            title="재시도"
          >
            <RefreshCw size={12} />
          </button>
        ) : (
          <StatusIcon status={status} />
        )}

        {/* 삭제 버튼 (호버 시 표시) */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
            title="삭제"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 파일 업로드 아이템 컴포넌트
 */
export function FileUploadItem(props: FileUploadItemProps) {
  if (props.variant === "wide") {
    return <WideLayout {...props} />;
  }
  return <CompactLayout {...props} />;
}
