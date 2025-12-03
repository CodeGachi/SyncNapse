/**
 * 폴더 이름 변경 모달 컴포넌트
 * 기존 폴더 이름을 새 이름으로 변경
 */
import { useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";

interface RenameFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
  currentName: string;
}

export function RenameFolderModal({
  isOpen,
  onClose,
  onRename,
  currentName,
}: RenameFolderModalProps) {
  const [newName, setNewName] = useState(currentName);

  // 모달 열릴 때 현재 이름으로 초기화
  useEffect(() => {
    if (isOpen) {
      setNewName(currentName);
    }
  }, [isOpen, currentName]);

  const handleClose = () => {
    setNewName(currentName);
    onClose();
  };

  const handleSubmit = () => {
    if (newName.trim()) {
      onRename(newName.trim());
      handleClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newName.trim()) {
      handleSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="폴더 이름 변경"
      contentClassName="bg-background-modal/90 border border-[#9ca3af] dark:border-border-subtle shadow-2xl shadow-black/20 dark:shadow-black/50 backdrop-blur-xl rounded-3xl w-[90vw] md:w-[400px] max-w-[400px]"
    >
      <div className="flex flex-col gap-6 p-6 pt-0">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="새 폴더 이름"
          className="bg-black/[0.03] dark:bg-foreground/5 border border-[#9ca3af] dark:border-border-subtle rounded-xl px-4 py-3 text-foreground placeholder-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-secondary text-lg"
          autoFocus
        />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose}>
            취소
          </Button>
          <Button variant="brand" onClick={handleSubmit} disabled={!newName.trim()}>
            변경
          </Button>
        </div>
      </div>
    </Modal>
  );
}
