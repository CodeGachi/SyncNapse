/**
 * FolderSelectorModal Hook
 * tempSelectedId and expandedFolders Management */ 
import { useState, useEffect } from "react";

interface UseFolderSelectorModalProps {
  isOpen: boolean;
  selectedFolderId: string;
}

export function useFolderSelectorModal({ isOpen, selectedFolderId }: UseFolderSelectorModalProps) {
  const [tempSelectedId, setTempSelectedId] = useState(selectedFolderId);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Initialize with current selected folder when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedFolderId);
    }
  }, [isOpen, selectedFolderId]);

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

  return {
    tempSelectedId,
    setTempSelectedId,
    expandedFolders,
    toggleFolder,
  };
}
