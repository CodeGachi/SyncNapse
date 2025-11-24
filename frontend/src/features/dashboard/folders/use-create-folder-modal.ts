/**
 * CreateFolderModal Hook
 * Form Status, expandedFolders, Folder Path Calculation  */

import { useState, useEffect } from "react";
import type { FolderTreeNode } from "@/features/dashboard";

interface UseCreateFolderModalProps {
  isOpen: boolean;
  onCreate: (folderName: string, parentId: string | null) => Promise<void>;
  folderTree: FolderTreeNode[];
}

export function useCreateFolderModal({ isOpen, onCreate, folderTree }: UseCreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // Initialize when modal opens - default to Root folder ID
  useEffect(() => {
    if (isOpen) {
      setFolderName("");
      // Root 폴더 ID를 기본값으로 설정 (null 대신)
      const rootFolderId = folderTree.length > 0 ? folderTree[0].folder.id : null;
      setSelectedParentId(rootFolderId);
    }
  }, [isOpen, folderTree]);

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

  const handleCreate = async () => {
    if (!folderName.trim()) {
      alert("폴더 이름을 입력해주세요.");
      return;
    }

    try {
      setIsCreating(true);
      await onCreate(folderName.trim(), selectedParentId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "폴더 생성에 실패했습니다.");
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const getSelectedLocationText = () => {
    // Root 폴더 ID와 비교하거나 null인 경우 "Root" 반환
    const rootFolderId = folderTree.length > 0 ? folderTree[0].folder.id : null;
    if (selectedParentId === null || selectedParentId === rootFolderId) return "Root";

    const findFolder = (nodes: FolderTreeNode[]): string | null => {
      for (const node of nodes) {
        if (node.folder.id === selectedParentId) {
          // If the folder is the "Root" system folder, display it as "Root" instead
          if (node.folder.name === "Root" && node.folder.parentId === null) {
            return "Root";
          }
          return node.folder.name;
        }
        if (node.children.length > 0) {
          const found = findFolder(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFolder(folderTree) || "Root";
  };

  return {
    folderName,
    setFolderName,
    selectedParentId,
    setSelectedParentId,
    expandedFolders,
    isCreating,
    toggleFolder,
    handleCreate,
    getSelectedLocationText,
  };
}
