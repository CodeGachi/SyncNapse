/**
 * DeleteFolderModal Hook
 * Delete Loading Status Management
 */

import { useState } from "react";

interface UseDeleteFolderModalProps {
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function useDeleteFolderModal({ onDelete, onClose }: UseDeleteFolderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "폴더 삭제에 실패했습니다.");
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    handleDelete,
  };
}
