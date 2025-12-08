/**
 * 폴더 경로 브레드크럼 컴포넌트
 * 현재 폴더 위치를 계층적으로 표시하고 클릭하여 이동 가능
 */

"use client";

import { memo } from "react";
import type { Folder } from "@/lib/types";

interface BreadcrumbProps {
  /** 폴더 경로 배열 (루트부터 현재 폴더까지) */
  path: Folder[];
  /** 폴더 클릭 핸들러 */
  onFolderClick: (folderId: string) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

export const Breadcrumb = memo(function Breadcrumb({
  path,
  onFolderClick,
  isLoading = false,
}: BreadcrumbProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-6">
        <div className="w-20 h-4 bg-foreground/10 rounded animate-pulse" />
        <div className="w-4 h-4 bg-foreground/10 rounded animate-pulse" />
        <div className="w-24 h-4 bg-foreground/10 rounded animate-pulse" />
      </div>
    );
  }

  if (path.length === 0) {
    return null;
  }

  return (
    <nav aria-label="폴더 경로" className="flex items-center gap-1 min-w-0">
      {path.map((folder, index) => {
        const isLast = index === path.length - 1;
        const isRoot = folder.name === "Root" && folder.parentId === null;
        const displayName = isRoot ? "홈" : folder.name;

        return (
          <div key={folder.id} className="flex items-center gap-1 min-w-0">
            {/* 구분자 (첫 번째 항목 제외) */}
            {index > 0 && (
              <svg
                className="w-4 h-4 text-foreground-tertiary flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}

            {/* 폴더 버튼 */}
            <button
              onClick={() => onFolderClick(folder.id)}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200 min-w-0
                ${isLast
                  ? "text-foreground font-medium bg-foreground/5"
                  : "text-foreground-tertiary hover:text-foreground hover:bg-foreground/5"
                }
              `}
              title={displayName}
            >
              {/* 폴더 아이콘 (루트는 홈 아이콘) */}
              {isRoot ? (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              )}

              {/* 폴더명 */}
              <span className="truncate max-w-[120px] text-sm">{displayName}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
});
