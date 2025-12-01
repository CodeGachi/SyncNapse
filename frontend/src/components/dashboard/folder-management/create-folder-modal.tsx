/**
 * 폴더 생성 모달 컴포넌트
 * 새 폴더 이름 입력 및 위치 선택
 */
import { useState, useCallback, KeyboardEvent } from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { useFolders } from "@/features/dashboard";
import { FolderSelectorModal } from "./folder-selector-modal";
import { logger } from "@/lib/utils/logger";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string | null;
}

export function CreateFolderModal({
  isOpen,
  onClose,
  parentId: initialParentId,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    initialParentId || null
  );
  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const { createFolder, buildFolderTree, folders } = useFolders();

  const handleClose = useCallback(() => {
    setFolderName("");
    setSelectedParentId(initialParentId || null);
    onClose();
  }, [initialParentId, onClose]);

  const handleSubmit = async () => {
    if (!folderName.trim()) return;

    try {
      await createFolder(folderName, selectedParentId);
      handleClose();
    } catch (error) {
      logger.error("폴더 생성 실패:", error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && folderName.trim()) {
      handleSubmit();
    }
  };

  const getParentFolderName = () => {
    if (!selectedParentId) return "Root";
    const parent = folders.find((f) => f.id === selectedParentId);
    return parent ? parent.name : "Root";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="새 폴더 만들기"
      contentClassName="bg-background-modal/90 border border-border-subtle shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-[500px]"
    >
      <div className="flex flex-col gap-6 p-6 pt-0">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground-secondary">폴더 이름</label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="폴더 이름을 입력하세요"
            className="bg-foreground/5 border border-border-subtle rounded-xl px-4 py-3 text-foreground placeholder-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-secondary text-lg"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground-secondary">위치</label>
          <button
            onClick={() => setIsFolderSelectorOpen(true)}
            className="flex items-center justify-between bg-foreground/5 border border-border-subtle rounded-xl px-4 py-3 text-foreground hover:bg-foreground/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground-tertiary">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {getParentFolderName()}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground-tertiary">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-2">
          <Button variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button variant="brand" onClick={handleSubmit} disabled={!folderName.trim()}>
            만들기
          </Button>
        </div>
      </div>

      <FolderSelectorModal
        isOpen={isFolderSelectorOpen}
        onClose={() => setIsFolderSelectorOpen(false)}
        onSelect={(folderId) => {
          setSelectedParentId(folderId);
          setIsFolderSelectorOpen(false);
        }}
        folderTree={buildFolderTree()}
        selectedFolderId={selectedParentId}
      />
    </Modal>
  );
}
