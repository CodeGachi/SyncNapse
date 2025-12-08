/**
 * 대시보드 사이드바 훅
 * 폴더 CRUD 비즈니스 로직 및 상태 관리
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("DashboardSidebar");
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
  const router = useRouter();
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();
  const deleteNoteMutation = useDeleteNote();

  // 노트 생성 UI 상태
  const [isNoteDropdownOpen, setIsNoteDropdownOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNoteType, setSelectedNoteType] = useState<"student" | "educator">("student");

  // 폴더 모달 상태
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createSubfolderParentId, setCreateSubfolderParentId] = useState<
    string | null
  >(null);
  const [renamingFolder, setRenamingFolder] = useState<DBFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<DBFolder | null>(null);
  const [deletingNote, setDeletingNote] = useState<{ id: string; title: string } | null>(null);

  // 노트 드롭다운 토글
  const toggleNoteDropdown = useCallback(() => {
    setIsNoteDropdownOpen((prev) => !prev);
  }, []);

  // 노트 드롭다운 닫기
  const closeNoteDropdown = useCallback(() => {
    setIsNoteDropdownOpen(false);
  }, []);

  // 노트 타입 선택 및 모달 열기
  const openNoteModal = useCallback((type: "student" | "educator") => {
    setSelectedNoteType(type);
    setIsNoteModalOpen(true);
    setIsNoteDropdownOpen(false);
  }, []);

  // 노트 모달 닫기
  const closeNoteModal = useCallback(() => {
    setIsNoteModalOpen(false);
  }, []);

  // 네비게이션 핸들러
  const navigateToProfile = useCallback(() => {
    router.push("/dashboard/profile");
  }, [router]);

  const navigateToTrash = useCallback(() => {
    router.push("/dashboard/trash");
  }, [router]);

  const navigateToHome = useCallback(() => {
    onSelectFolder(null);
    router.push("/dashboard/main");
  }, [router, onSelectFolder]);

  const navigateToLogout = useCallback(() => {
    router.push("/auth/logout");
  }, [router]);

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
      log.debug("노트 삭제 완료:", deletingNote.id);
      setDeletingNote(null);
    } catch (error) {
      log.error("노트 삭제 실패:", error);
      alert("노트 삭제에 실패했습니다.");
    }
  };

  // 폴더 생성 모달 닫기
  const closeCreateFolderModal = useCallback(() => {
    setIsCreateFolderModalOpen(false);
    setCreateSubfolderParentId(null);
  }, []);

  return {
    // 노트 생성 UI 상태
    isNoteDropdownOpen,
    isNoteModalOpen,
    selectedNoteType,

    // 노트 생성 핸들러
    toggleNoteDropdown,
    closeNoteDropdown,
    openNoteModal,
    closeNoteModal,

    // 네비게이션 핸들러
    navigateToProfile,
    navigateToTrash,
    navigateToHome,
    navigateToLogout,

    // 폴더 모달 상태
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

    // 핸들러
    handleCreateFolderModal,
    handleCreateSubFolder,
    handleRenameFolder,
    handleRenameSubmit,
    handleDeleteFolder,
    handleDeleteSubmit,
    handleDeleteNote,
    handleDeleteNoteSubmit,
    closeCreateFolderModal,
  };
}
