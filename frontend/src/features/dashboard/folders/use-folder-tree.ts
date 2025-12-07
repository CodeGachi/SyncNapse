/**
 * 폴더 트리 훅
 * 폴더 확장/축소 상태 및 컨텍스트 메뉴 관리
 */
import { useState } from "react";

export function useFolderTree() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
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

  return {
    expandedFolders,
    contextMenu,
    toggleFolder,
    handleContextMenu,
    closeContextMenu,
    handleContextMenuAction,
  };
}
