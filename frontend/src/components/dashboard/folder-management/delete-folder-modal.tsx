/**
 * 폴더 삭제 확인 모달
 */

"use client";

import { Modal } from "@/components/common/modal";
import { useDeleteFolderModal } from "@/features/dashboard";

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  folderName: string;
}

export function DeleteFolderModal({
  isOpen,
  onClose,
  onDelete,
  folderName,
}: DeleteFolderModalProps) {
  const { isDeleting, handleDelete } = useDeleteFolderModal({ onDelete, onClose });

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
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">Delete Folder</h3>
          <p className="text-sm text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">&quot;{folderName}&quot;</span>?
          </p>
        </div>
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
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

      {/* 경고 메시지 */}
      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
        <p className="text-sm text-yellow-200">
          This folder and all its contents will be moved to the trash. You can restore it
          within 15 days.
        </p>
      </div>

      {/* 추가 정보 */}
      <div className="text-xs text-gray-400">
        <ul className="list-disc list-inside space-y-1">
          <li>All subfolders will also be moved to trash</li>
          <li>Notes in this folder will be moved to trash</li>
          <li>Files and recordings will be preserved for restore</li>
        </ul>
      </div>

      {/* 푸터 */}
      <div className="flex justify-end gap-3 pt-2 border-t border-[#3C3C3C]">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="px-4 py-2 bg-[#575757] text-white rounded-lg hover:bg-[#6B6B6B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? "Deleting..." : "Delete Folder"}
        </button>
      </div>
    </Modal>
  );
}
