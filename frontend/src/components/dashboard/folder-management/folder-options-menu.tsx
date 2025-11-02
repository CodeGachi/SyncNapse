/**
 * 폴더 옵션 메뉴
 * 이름 변경, 하위 폴더 추가, 삭제 등의 작업을 제공
 */

"use client";

import type { DBFolder } from "@/lib/db/folders";
import { useFolderOptionsMenu } from "@/features/dashboard";

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

  return (
    <div className="relative">
      {/* 옵션 버튼 */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="p-1 hover:bg-[#3C3C3C] rounded transition-colors opacity-0 group-hover:opacity-100"
        title="Folder options"
      >
        <svg
          className="w-4 h-4 text-gray-400 hover:text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-48 bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg shadow-lg z-50 py-1"
        >
          {/* 이름 변경 */}
          <button
            onClick={() => handleOptionClick(onRename)}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3C3C3C] hover:text-white transition-colors flex items-center gap-2"
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

          {/* 하위 폴더 추가 */}
          <button
            onClick={() => handleOptionClick(onAddSubfolder)}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3C3C3C] hover:text-white transition-colors flex items-center gap-2"
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

          {/* 구분선 */}
          <div className="my-1 border-t border-[#3C3C3C]" />

          {/* 삭제 */}
          <button
            onClick={() => handleOptionClick(onDelete)}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center gap-2"
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
        </div>
      )}
    </div>
  );
}
