import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import type { FolderTreeNode } from "@/features/dashboard";
import { FolderSelector } from "@/components/dashboard/folder-management/folder-selector";
import { useState } from "react";

interface FolderSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folderId: string) => void;
  folderTree: FolderTreeNode[];
  selectedFolderId: string;
}

export function FolderSelectorModal({
  isOpen,
  onClose,
  onSelect,
  folderTree,
  selectedFolderId,
}: FolderSelectorModalProps) {
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedFolderId || null);

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
      contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-8 flex flex-col gap-6 w-[480px] max-h-[80vh]"
    >
      <div className="flex flex-col gap-6">
        {/* 폴더 트리 */}
        <div className="bg-[#262626] border border-[#575757] rounded-xl p-2 max-h-[400px] overflow-y-auto">
          {/* 루트 폴더 */}
          <button
            onClick={() => setTempSelectedId("root")}
            className={`w-full px-3 py-2.5 text-left rounded-lg transition-all flex items-center gap-3 ${tempSelectedId === "root"
              ? 'bg-[#899649]/30 text-white ring-1 ring-[#899649]/50'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <div className="w-4 h-4" /> {/* Indent spacer */}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-sm font-medium">Root</span>
          </button>

          {/* 폴더 트리 */}
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
