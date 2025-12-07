/**
 * 폴더 이름 변경 모달 훅
 * 폼 상태 및 이름 변경 처리
 */
import { useState, useEffect } from "react";

interface UseRenameFolderModalProps {
  isOpen: boolean;
  currentName: string;
  onRename: (newName: string) => Promise<void>;
}

export function useRenameFolderModal({ isOpen, currentName, onRename }: UseRenameFolderModalProps) {
  const [folderName, setFolderName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);

  // 모달 열릴 때 현재 이름으로 초기화
  useEffect(() => {
    if (isOpen) {
      setFolderName(currentName);
    }
  }, [isOpen, currentName]);

  const handleRename = async () => {
    if (!folderName.trim()) {
      alert("폴더 이름을 입력해주세요.");
      return;
    }

    if (folderName.trim() === currentName) {
      alert("새 이름이 기존 이름과 같습니다.");
      return;
    }

    try {
      setIsRenaming(true);
      await onRename(folderName.trim());
    } catch (err) {
      alert(err instanceof Error ? err.message : "폴더 이름 변경에 실패했습니다.");
      throw err;
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRenaming) {
      handleRename();
    }
  };

  return {
    folderName,
    setFolderName,
    isRenaming,
    handleRename,
    handleKeyPress,
  };
}
