/**
 * 폴더 이름 변경 모달
 */

"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/common/modal";

interface RenameFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  currentName: string;
}

export function RenameFolderModal({
  isOpen,
  onClose,
  onRename,
  currentName,
}: RenameFolderModalProps) {
  const [folderName, setFolderName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);

  // 모달이 열릴 때마다 현재 이름으로 초기화
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
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "폴더 이름 변경에 실패했습니다.");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRenaming) {
      handleRename();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-50 transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      contentClassName="bg-[#2F2F2F] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 w-full max-w-[450px]"
      closeButton={false}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Rename Folder</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L17 17M17 1L1 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 폴더 이름 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          New Folder Name
        </label>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter new name"
          className="w-full bg-[#191919] text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#6B7B3E] placeholder-gray-500"
          autoFocus
        />
      </div>

      {/* 현재 이름 표시 */}
      <div className="text-xs text-gray-400">
        Current name: <span className="text-gray-300">{currentName}</span>
      </div>

      {/* 푸터 */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[#3C3C3C]">
        <button
          onClick={onClose}
          disabled={isRenaming}
          className="px-4 py-2 bg-[#575757] text-white rounded-lg hover:bg-[#6B6B6B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleRename}
          disabled={!folderName.trim() || isRenaming || folderName.trim() === currentName}
          className="px-4 py-2 bg-[#6B7B3E] text-white rounded-lg hover:bg-[#7A8A4D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRenaming ? "Renaming..." : "Rename"}
        </button>
      </div>
    </Modal>
  );
}
