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

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setFolderName("");
      setSelectedParentId(null);
    }
  }, [isOpen]);

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
    if (selectedParentId === null) return "루트";

    const findFolder = (nodes: FolderTreeNode[]): string | null => {
      for (const node of nodes) {
        if (node.folder.id === selectedParentId) {
          // If the folder is the "Root" system folder, display it as "루트" instead
          if (node.folder.name === "Root" && node.folder.parentId === null) {
            return "루트";
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
    return findFolder(folderTree) || "루트";
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
