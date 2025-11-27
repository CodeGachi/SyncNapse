/**
 * DashboardSidebar Hook
 * 폴더 CRUD 비즈니스 로직 및 상태 관리
 */

import { useState } from "react";
import { useFolders } from "@/features/dashboard";
import type { DBFolder } from "@/lib/db/folders";
import { useDeleteNote } from "@/lib/api/mutations/notes.mutations";

interface UseDashboardSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function useDashboardSidebar({
  selectedFolderId,
  onSelectFolder,
}: UseDashboardSidebarProps) {
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();
  const deleteNoteMutation = useDeleteNote();

  // 폴더 모달 상태
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createSubfolderParentId, setCreateSubfolderParentId] = useState<
    string | null
  >(null);
  const [renamingFolder, setRenamingFolder] = useState<DBFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<DBFolder | null>(null);
  const [deletingNote, setDeletingNote] = useState<{ id: string; title: string } | null>(null);

  // 폴더 생성 핸들러
  const handleCreateFolderModal = async (
    folderName: string,
    parentId: string | null
  ) => {
    try {
      await createFolder(folderName, parentId);
    } catch (error) {
      throw error;
    }
  };

  // 하위 폴더 생성 핸들러
  const handleCreateSubFolder = (parentId: string) => {
    setCreateSubfolderParentId(parentId);
    setIsCreateFolderModalOpen(true);
  };

  // 폴더 이름 변경 핸들러
  const handleRenameFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      setRenamingFolder(folder);
    }
  };

  // 폴더 이름 변경 실행
  const handleRenameSubmit = async (newName: string) => {
    if (!renamingFolder) {
      return;
    }
    try {
      await renameFolder(renamingFolder.id, newName);
      setRenamingFolder(null);
    } catch (error) {
      throw error;
    }
  };

  // 폴더 삭제 핸들러
  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      setDeletingFolder(folder);
    }
  };

  // 폴더 삭제 실행
  const handleDeleteSubmit = async () => {
    if (!deletingFolder) {
      return;
    }
    try {
      await deleteFolder(deletingFolder.id);
      if (selectedFolderId === deletingFolder.id) {
        onSelectFolder(null);
      }
      setDeletingFolder(null);
    } catch (error) {
      throw error;
    }
  };

  // 노트 삭제 핸들러 (모달 열기)
  const handleDeleteNote = (noteId: string, noteTitle: string) => {
    setDeletingNote({ id: noteId, title: noteTitle });
  };

  // 노트 삭제 실행
  const handleDeleteNoteSubmit = async () => {
    if (!deletingNote) return;

    try {
      await deleteNoteMutation.mutateAsync(deletingNote.id);
      console.log(`[DashboardSidebar] Note deleted: ${deletingNote.id}`);
      setDeletingNote(null);
    } catch (error) {
      console.error(`[DashboardSidebar] Failed to delete note:`, error);
      alert("노트 삭제에 실패했습니다.");
    }
  };

  return {
    // Folder Modal states
    isCreateFolderModalOpen,
    setIsCreateFolderModalOpen,
    createSubfolderParentId,
    setCreateSubfolderParentId,
    renamingFolder,
    setRenamingFolder,
    deletingFolder,
    setDeletingFolder,
    deletingNote,
    setDeletingNote,

    // Handlers
    handleCreateFolderModal,
    handleCreateSubFolder,
    handleRenameFolder,
    handleRenameSubmit,
    handleDeleteFolder,
    handleDeleteSubmit,
    handleDeleteNote,
    handleDeleteNoteSubmit,
  };
}
