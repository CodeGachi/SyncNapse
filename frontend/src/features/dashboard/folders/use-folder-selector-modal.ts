/**
 * 폴더 선택 모달 훅
 * 임시 선택 ID 및 폴더 확장/축소 상태 관리
 */
import { useState, useEffect } from "react";

interface UseFolderSelectorModalProps {
  isOpen: boolean;
  selectedFolderId: string;
}

export function useFolderSelectorModal({ isOpen, selectedFolderId }: UseFolderSelectorModalProps) {
  const [tempSelectedId, setTempSelectedId] = useState(selectedFolderId);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // 모달 열릴 때 현재 선택된 폴더로 초기화
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
