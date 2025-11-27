import { useState, useEffect } from "react";
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

  useEffect(() => {
    setNewName(currentName);
  }, [currentName]);

  const handleSubmit = () => {
    if (newName.trim()) {
      onRename(newName);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="폴더 이름 변경"
      contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-[400px]"
    >
      <div className="flex flex-col gap-6 p-6 pt-0">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 폴더 이름"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#899649] text-lg"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
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
