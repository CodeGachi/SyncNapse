/**
 * 폴더 옵션 메뉴
 * 이름 변경, 하위 폴더 추가, 삭제 등의 작업을 제공
 */

"use client";

import { useState, useEffect } from "react";
import type { DBFolder } from "@/lib/db/folders";
import { useFolderOptionsMenu } from "@/features/dashboard";

// 메뉴 크기 상수
const MENU_HEIGHT_ROOT = 50; // Root 폴더 메뉴 높이 (항목 1개)
const MENU_HEIGHT_FULL = 150; // 전체 메뉴 높이 (항목 3개)
const MENU_WIDTH = 192; // w-48 = 12rem = 192px
const MENU_GAP = 8; // 버튼과 메뉴 사이 간격

interface FolderOptionsMenuProps {
  folder: DBFolder;
  onRename: () => void;
  onAddSubfolder: () => void;
  onDelete: () => void;
}

export function FolderOptionsMenu({
  folder,
  onRename,
  onAddSubfolder,
  onDelete,
}: FolderOptionsMenuProps) {
  const { isOpen, menuRef, buttonRef, handleToggle, handleOptionClick } =
    useFolderOptionsMenu();

  // Root 폴더인지 확인
  const isRootFolder = folder.name === "Root" && folder.parentId === null;

  // 버튼 위치를 기준으로 메뉴 위치 계산
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = isRootFolder ? MENU_HEIGHT_ROOT : MENU_HEIGHT_FULL;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // 화면 하단에 공간이 부족하면 위로 표시
      const showAbove = rect.bottom + menuHeight > viewportHeight;

      // 버튼 오른쪽에 표시, 화면 밖으로 나가면 왼쪽에 표시
      const showOnLeft = rect.right + MENU_WIDTH + MENU_GAP > viewportWidth;

      setMenuPosition({
        top: showAbove ? rect.top - menuHeight + rect.height : rect.top,
        left: showOnLeft ? rect.left - MENU_WIDTH - MENU_GAP : rect.right + MENU_GAP,
      });
    }
  }, [isOpen, buttonRef, isRootFolder]);

  return (
    <div className="relative">
      {/* 옵션 버튼 */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="p-1 hover:bg-background-elevated rounded transition-colors opacity-0 group-hover:opacity-100"
        title="Folder options"
      >
        <svg
          className="w-4 h-4 text-foreground-tertiary hover:text-foreground"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 - fixed position으로 변경하여 overflow 문제 해결 */}
      {isOpen && (
        <>
          {/* 클릭 외부 영역 감지용 오버레이 */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
          />
          <div
            ref={menuRef}
            className="fixed w-48 bg-background-elevated border border-border-subtle rounded-lg shadow-lg z-50 py-1"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
          {/* 이름 변경 (Root 폴더는 제외) */}
          {!isRootFolder && (
            <button
              onClick={() => handleOptionClick(onRename)}
              className="w-full px-4 py-2 text-left text-sm text-foreground-secondary hover:bg-background-overlay hover:text-foreground transition-colors flex items-center gap-2"
            >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Rename
            </button>
          )}

          {/* 하위 폴더 추가 */}
          <button
            onClick={() => handleOptionClick(onAddSubfolder)}
            className="w-full px-4 py-2 text-left text-sm text-foreground-secondary hover:bg-background-overlay hover:text-foreground transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            Add Subfolder
          </button>

          {/* 구분선 (Root 폴더가 아닐 때만) */}
          {!isRootFolder && <div className="my-1 border-t border-border-subtle" />}

          {/* 삭제 (Root 폴더는 제외) */}
          {!isRootFolder && (
            <button
              onClick={() => handleOptionClick(onDelete)}
              className="w-full px-4 py-2 text-left text-sm text-status-error hover:bg-status-error/10 hover:text-status-error transition-colors flex items-center gap-2"
            >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
            </button>
          )}
          </div>
        </>
      )}
    </div>
  );
}
