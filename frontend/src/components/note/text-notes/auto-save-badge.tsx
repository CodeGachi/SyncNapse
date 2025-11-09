/**
 * AutoSave Status Badge Component
 * 자동저장 상태를 시각적으로 표시
 */

"use client";

import type { AutoSaveStatus } from "@/lib/types";

interface AutoSaveBadgeProps {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
}

export function AutoSaveBadge({ status, lastSavedAt }: AutoSaveBadgeProps) {
  // Status Info Mapping
  const getStatusInfo = () => {
    switch (status) {
      case "saved":
        return {
          text: "저장됨",
          color: "bg-green-600",
          icon: (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        };
      case "saving":
        return {
          text: "저장 중",
          color: "bg-blue-600",
          icon: (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ),
        };
      case "error":
        return {
          text: "저장 실패",
          color: "bg-red-600",
          icon: (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M9 3L3 9M3 3L9 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
        };
      case "idle":
      default:
        return {
          text: "대기 중",
          color: "bg-gray-600",
          icon: (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle
                cx="6"
                cy="6"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          ),
        };
    }
  };

  // Format Last Saved Time
  const formatLastSaved = () => {
    if (!lastSavedAt) return null;

    const now = new Date();
    const saved = new Date(lastSavedAt);
    const diffMs = now.getTime() - saved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) {
      return "방금 전";
    } else if (diffMins < 60) {
      return `${diffMins}분 전`;
    } else {
      const hours = Math.floor(diffMins / 60);
      return `${hours}시간 전`;
    }
  };

  const { text, color, icon } = getStatusInfo();
  const lastSavedText = formatLastSaved();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${color} px-3 py-1 rounded-full flex items-center gap-2`}
      >
        {icon}
        <span className="text-white text-xs font-medium">{text}</span>
      </div>
      {lastSavedText && status === "saved" && (
        <span className="text-gray-400 text-xs">{lastSavedText}</span>
      )}
    </div>
  );
}
