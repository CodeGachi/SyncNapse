/**
 * 폴더 선택 모달 컴포넌트
 * 폴더 트리에서 대상 폴더 선택
 */
import { useState, useEffect } from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import type { FolderTreeNode } from "@/features/dashboard";
import { FolderSelector } from "@/components/dashboard/folder-management/folder-selector";

interface FolderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string) => void;
  folderTree: FolderTreeNode[];
  selectedFolderId?: string | null;
}

export function FolderSelectorModal({
  isOpen,
  onClose,
  onSelect,
  folderTree,
  selectedFolderId,
}: FolderSelectorModalProps) {
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedFolderId || null);

  // 모달 열릴 때 선택 상태 동기화
  useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedFolderId || null);
    }
  }, [isOpen, selectedFolderId]);

  const handleConfirm = () => {
    if (tempSelectedId) {
      onSelect(tempSelectedId);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="폴더 선택"
      contentClassName="bg-background-modal/90 border border-border-subtle shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 w-[90vw] md:w-[480px] max-w-[480px] max-h-[80vh]"
    >
      <div className="flex flex-col gap-6">
        {/* 폴더 트리 */}
        <div className="bg-transparent border border-border rounded-xl p-2 max-h-[400px] overflow-y-auto">
          <FolderSelector
            tree={folderTree}
            selectedFolderId={tempSelectedId}
            onSelectFolder={setTempSelectedId}
          />
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="brand" onClick={handleConfirm} disabled={!tempSelectedId}>
            선택
          </Button>
        </div>
      </div>
    </Modal>
  );
}
