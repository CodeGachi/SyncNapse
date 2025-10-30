/**
 * Dashboard Sidebar UI Component
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { NoteSettingsModal } from "@/components/dashboard/create-note-modal";
import { CreateMenu } from "@/components/dashboard/create-menu";
import { CreateFolderModal } from "@/components/dashboard/create-folder-modal";
import { RenameFolderModal } from "@/components/dashboard/rename-folder-modal";
import { DeleteFolderModal } from "@/components/dashboard/delete-folder-modal";
import { NotificationCenter } from "@/components/notification/notification-center";
import { FolderTree } from "@/components/dashboard/folder-tree";
import { useDashboard } from "@/features/dashboard";
import { useAuth } from "@/features/auth/use-auth";
import { useGoogleLogin } from "@/features/auth/google-login";
import { useModalStore } from "@/stores";
import { useFolders } from "@/features/dashboard/use-folders";
import type { DBFolder } from "@/lib/db/folders";

interface DashboardSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function DashboardSidebar({
  selectedFolderId,
  onSelectFolder,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { handleCreateNote } = useDashboard();
  const { user } = useAuth();
  const { handleLogout } = useGoogleLogin();
  const { buildFolderTree, createFolder, renameFolder, deleteFolder } =
    useFolders();

  const { isSettingsModalOpen, openSettingsModal, closeSettingsModal } =
    useModalStore();

  // 폴더 모달 상태
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createSubfolderParentId, setCreateSubfolderParentId] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<DBFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<DBFolder | null>(null);
  const { folders } = useFolders();

  // 폴더 생성 핸들러 (모달 방식)
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

  // 하위 폴더 생성 핸들러 (옵션 메뉴용)
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
      setRenamingFolder(null); // 성공 시 모달 닫기
    } catch (error) {
      // 에러는 모달에서 처리됨
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
      setDeletingFolder(null); // 성공 시 모달 닫기
    } catch (error) {
      // 에러는 모달에서 처리됨
      throw error;
    }
  };

  return (
    <>
    <aside className="w-[214px] h-screen bg-[#191919] flex flex-col p-4 border-r border-[#2F2F2F]">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-white text-xl font-bold flex items-center gap-2 hover:text-[#AFC02B] transition-colors"
        >
          SyncNapse
        </button>
        {/* alarm */}
        <NotificationCenter />
      </div>

      {/* profile */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-[#2F2F2F] rounded-lg">
        {user?.picture ? (
          <Image
            src={user.picture}
            alt={user.name}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">
            {user?.name || "사용자"}
          </div>
          <div className="text-gray-400 text-xs truncate">
            {user?.email || "user@example.com"}
          </div>
        </div>
      </div>

      {/* create new menu */}
      <div className="mb-4">
        <CreateMenu
          onCreateNote={openSettingsModal}
          onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        />
      </div>

      {/* folder and note list */}
      <nav className="flex-1 overflow-y-auto">
        {/* 폴더 섹션 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold mb-2 px-2">
            <span>Folders</span>
          </div>

          {/* 전체 노트 버튼 */}
          <button
            onClick={() => onSelectFolder(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors mb-1 ${
              selectedFolderId === null
                ? "bg-[#6B7B3E] text-white"
                : "text-gray-300 hover:bg-[#2F2F2F] hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
              <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <span className="text-sm">전체 노트</span>
          </button>

          {/* 폴더 트리 */}
          <FolderTree
            tree={buildFolderTree()}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onCreateSubFolder={handleCreateSubFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>
      </nav>

      {/* bottom menu */}
      <div className="border-t border-[#2F2F2F] pt-4 space-y-1">
        <button
          onClick={() => router.push("/trash")}
          className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm"
        >
          Trash
        </button>
        <button
          onClick={() => router.push("/profile")}
          className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm"
        >
          My Profile
        </button>
        <button
          onClick={handleLogout}
          className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm"
        >
          Logout
        </button>
      </div>
    </aside>

    {/* note creation modal */}
    <NoteSettingsModal
      isOpen={isSettingsModalOpen}
      onClose={closeSettingsModal}
      onSubmit={handleCreateNote}
    />

    {/* folder creation modal */}
    <CreateFolderModal
      isOpen={isCreateFolderModalOpen}
      onClose={() => {
        setIsCreateFolderModalOpen(false);
        setCreateSubfolderParentId(null);
      }}
      onCreate={async (name, parentId) => {
        // 하위 폴더 생성 시 저장된 parentId 사용
        const actualParentId = createSubfolderParentId || parentId;
        await handleCreateFolderModal(name, actualParentId);
        setCreateSubfolderParentId(null);
      }}
      folderTree={buildFolderTree()}
    />

    {/* folder rename modal */}
    {renamingFolder && (
      <RenameFolderModal
        isOpen={true}
        onClose={() => setRenamingFolder(null)}
        onRename={handleRenameSubmit}
        currentName={renamingFolder.name}
      />
    )}

    {/* folder delete modal */}
    {deletingFolder && (
      <DeleteFolderModal
        isOpen={true}
        onClose={() => setDeletingFolder(null)}
        onDelete={handleDeleteSubmit}
        folderName={deletingFolder.name}
      />
    )}
    </>
  );
}
