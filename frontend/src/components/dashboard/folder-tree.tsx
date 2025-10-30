/**
 * 폴더 트리 컴포넌트
 * 중첩된 폴더 구조를 재귀적으로 렌더링
 */

"use client";

import { useState } from "react";
import type { FolderTreeNode } from "@/features/dashboard/use-folders";
import { FolderOptionsMenu } from "./folder-options-menu";

interface FolderTreeProps {
  tree: FolderTreeNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateSubFolder: (parentId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  level?: number;
}

export function FolderTree({
  tree,
  selectedFolderId,
  onSelectFolder,
  onCreateSubFolder,
  onRenameFolder,
  onDeleteFolder,
  level = 0,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [contextMenu, setContextMenu] = useState<{
    folderId: string;
    x: number;
    y: number;
  } | null>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      folderId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleContextMenuAction = (action: () => void) => {
    action();
    closeContextMenu();
  };

  return (
    <>
      <ul className="space-y-1">
        {tree.map((node) => {
          const isExpanded = expandedFolders.has(node.folder.id);
          const isSelected = selectedFolderId === node.folder.id;
          const hasChildren = node.children.length > 0;

          return (
            <li key={node.folder.id}>
              <div
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
                  isSelected
                    ? "bg-[#6B7B3E] text-white"
                    : "text-gray-300 hover:bg-[#2F2F2F] hover:text-white"
                }`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onSelectFolder(node.folder.id)}
                onContextMenu={(e) => handleContextMenu(e, node.folder.id)}
              >
                {/* 확장/축소 아이콘 */}
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(node.folder.id);
                    }}
                    className="w-4 h-4 flex items-center justify-center"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                    </svg>
                  </button>
                )}

                {/* 폴더 아이콘 */}
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>

                {/* 폴더 이름 */}
                <span className="flex-1 text-sm truncate">
                  {node.folder.name}
                </span>

                {/* 폴더 옵션 메뉴 */}
                <FolderOptionsMenu
                  folder={node.folder}
                  onRename={() => onRenameFolder(node.folder.id)}
                  onAddSubfolder={() => onCreateSubFolder(node.folder.id)}
                  onDelete={() => onDeleteFolder(node.folder.id)}
                />
              </div>

              {/* 하위 폴더 */}
              {isExpanded && hasChildren && (
                <FolderTree
                  tree={node.children}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={onSelectFolder}
                  onCreateSubFolder={onCreateSubFolder}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                  level={level + 1}
                />
              )}
            </li>
          );
        })}
      </ul>

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-50 bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg shadow-lg py-1 w-48"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            {/* 이름 변경 */}
            <button
              onClick={() => handleContextMenuAction(() => onRenameFolder(contextMenu.folderId))}
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
              onClick={() => handleContextMenuAction(() => onCreateSubFolder(contextMenu.folderId))}
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
              onClick={() => handleContextMenuAction(() => onDeleteFolder(contextMenu.folderId))}
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
        </>
      )}
    </>
  );
}
