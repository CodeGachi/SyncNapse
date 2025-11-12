/**
 * Dashboard Sidebar UI Component
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { NoteSettingsModal } from "@/components/dashboard/note-creation/create-note-modal";
import { CreateMenu } from "@/components/dashboard/sidebar/create-menu";
import { CreateFolderModal } from "@/components/dashboard/folder-management/create-folder-modal";
import { RenameFolderModal } from "@/components/dashboard/folder-management/rename-folder-modal";
import { DeleteFolderModal } from "@/components/dashboard/folder-management/delete-folder-modal";
import { NotificationCenter } from "@/components/notification/notification-center";
import { FolderTree } from "@/components/dashboard/folder-management/folder-tree";
import { useDashboard } from "@/features/dashboard";
import { useAuth } from "@/features/auth/use-auth";
import { useGoogleLogin } from "@/features/auth/google-login";
import { useFolders } from "@/features/dashboard";
import { useDashboardSidebar } from "@/features/dashboard";

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
  const { buildFolderTree } = useFolders();

  // 간단한 UI 상태 - 컴포넌트에서 직접 관리
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [currentNoteType, setCurrentNoteType] = useState<"student" | "educator">("student");

  // 폴더 관련 상태와 핸들러 - use-dashboard-sidebar에서 관리
  const {
    isCreateFolderModalOpen,
    setIsCreateFolderModalOpen,
    createSubfolderParentId,
    setCreateSubfolderParentId,
    renamingFolder,
    setRenamingFolder,
    deletingFolder,
    setDeletingFolder,
    handleCreateFolderModal,
    handleCreateSubFolder,
    handleRenameFolder,
    handleRenameSubmit,
    handleDeleteFolder,
    handleDeleteSubmit,
  } = useDashboardSidebar({
    selectedFolderId,
    onSelectFolder,
  });

  return (
    <>
    <aside className="w-[214px] h-screen bg-[#191919] flex flex-col p-4 border-r border-[#2F2F2F]">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard/main")}
          className="text-white text-xl font-bold flex items-center gap-2 hover:text-[#AFC02B] transition-colors"
        >
          SyncNapse
        </button>
        {/* Notification center */}
        <NotificationCenter />
      </div>

      {/* User profile */}
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

      {/* Create new menu */}
      <div className="mb-4">
        <CreateMenu
          onCreatePersonalNote={() => {
            setCurrentNoteType("student");
            setIsSettingsModalOpen(true);
          }}
          onCreateLectureNote={() => {
            setCurrentNoteType("educator");
            setIsSettingsModalOpen(true);
          }}
          onCreateFolder={() => setIsCreateFolderModalOpen(true)}
        />
      </div>

      {/* Folder and note list */}
      <nav className="flex-1 overflow-y-auto">
        {/* Folder section */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold mb-2 px-2">
            <span>Folders</span>
          </div>

          {/* All notes button */}
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

          {/* Folder tree */}
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

      {/* Bottom menu */}
      <div className="border-t border-[#2F2F2F] pt-4 space-y-1">
        <button
          onClick={() => router.push("/dashboard/trash")}
          className="w-full text-left text-gray-400 hover:text-white hover:bg-[#2F2F2F] px-3 py-2 rounded-lg transition-colors text-sm"
        >
          Trash
        </button>
        <button
          onClick={() => router.push("/dashboard/profile")}
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

    {/* Note creation modal */}
    <NoteSettingsModal
      isOpen={isSettingsModalOpen}
      onClose={() => setIsSettingsModalOpen(false)}
      onSubmit={async (noteData) => {
        await handleCreateNote(noteData);
        setIsSettingsModalOpen(false);
      }}
      defaultFolderId={selectedFolderId}
      noteType={currentNoteType}
    />

    {/* Folder creation modal */}
    <CreateFolderModal
      isOpen={isCreateFolderModalOpen}
      onClose={() => {
        setIsCreateFolderModalOpen(false);
        setCreateSubfolderParentId(null);
      }}
      onCreate={async (name, parentId) => {
        // Use saved parentId when creating subfolder
        const actualParentId = createSubfolderParentId || parentId;
        await handleCreateFolderModal(name, actualParentId);
        setCreateSubfolderParentId(null);
        setIsCreateFolderModalOpen(false);
      }}
      folderTree={buildFolderTree()}
    />

    {/* Folder rename modal */}
    {renamingFolder && (
      <RenameFolderModal
        isOpen={true}
        onClose={() => setRenamingFolder(null)}
        onRename={handleRenameSubmit}
        currentName={renamingFolder.name}
      />
    )}

    {/* Folder delete modal */}
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
