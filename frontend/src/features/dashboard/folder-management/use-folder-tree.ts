/**
 * FolderTree Hook
 * expandedFolders Status and Text Menu Management */ 
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
