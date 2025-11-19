/**
 * New Dashboard Sidebar - Figma Design
 * 피그마 디자인 기반 사이드바 (참고.css 스타일 적용)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CreateFolderModal } from "@/components/dashboard/folder-management/create-folder-modal";
import { RenameFolderModal } from "@/components/dashboard/folder-management/rename-folder-modal";
import { DeleteFolderModal } from "@/components/dashboard/folder-management/delete-folder-modal";
import { FolderTree } from "@/components/dashboard/folder-management/folder-tree";
import { NoteTypeSelectorModal } from "@/components/dashboard/note-creation/note-type-selector-modal";
import { useAuth } from "@/features/auth/use-auth";
import { useFolders } from "@/features/dashboard";
import { useDashboardSidebar } from "@/features/dashboard";
import { useDashboard } from "@/features/dashboard";

interface NewSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function NewSidebar({
  selectedFolderId,
  onSelectFolder,
}: NewSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { buildFolderTree } = useFolders();
  const { handleCreateNote } = useDashboard();

  // UI 상태
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

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
    handleDeleteNote,
  } = useDashboardSidebar({
    selectedFolderId,
    onSelectFolder,
  });

  return (
    <>
      {/* Sidebar - width: 307px, bg: #2F2F2F */}
      <aside className="w-[307px] h-screen bg-[#2F2F2F] flex flex-col py-0 px-0 gap-2.5 border-r border-[#575757]">
        {/* Card - padding: 0px 8px */}
        <div className="flex flex-col justify-center items-start px-2 py-0 w-full">
          {/* Inner Card - padding: 4px 12px, gap: 8px */}
          <div className="flex flex-col items-start py-1 px-3 gap-2 w-full">
            {/* Top Section - padding: 12px 0px, gap: 18px, border-bottom */}
            <div className="flex flex-col items-start py-3 gap-[18px] w-full border-b border-[#575757]">
              {/* Logo Container - gap: 8px */}
              <div className="flex items-center gap-2 h-[42px]">
                <Image
                  src="/대시보드/Logo.svg"
                  alt="SyncNapse Logo"
                  width={42}
                  height={42}
                />
                <span className="text-white text-2xl font-bold leading-[29px] font-['Inter']">
                  SyncNapse
                </span>
              </div>

              {/* User Info - gap: 8px */}
              <div className="flex items-center gap-2 w-full h-[38px]">
                {user?.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={36}
                    height={36}
                    className="w-9 h-9 border border-white"
                    style={{ borderRadius: '50%' }}
                  />
                ) : (
                  <div className="w-9 h-9 bg-[#D9D9D9] border border-white flex items-center justify-center text-white font-bold"
                    style={{ borderRadius: '50%' }}>
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}

                <div className="flex flex-col gap-1 flex-1">
                  <div className="text-white font-bold text-xl leading-6 font-['Inter']"
                    style={{ textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)' }}>
                    {user?.name || "박태현"}
                  </div>
                  <div className="text-white font-bold text-[8px] leading-[10px] font-['Inter']">
                    {user?.email || "qkrxogus113@ajou.ac.kr"}
                  </div>
                </div>
              </div>

              {/* Button Container - gap: 24px */}
              <div className="flex justify-center items-center gap-6 w-full h-[46px]">
                {/* 새 노트 Button */}
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] rounded-[10px]"
                  style={{ background: 'rgba(175, 192, 43, 0.4)' }}
                >
                  <div className="flex items-center gap-1">
                    <Image
                      src="/대시보드/Text input.svg"
                      alt="새 노트"
                      width={20}
                      height={20}
                    />
                    <span className="text-white font-bold text-sm leading-[17px] text-center font-['Inter']">
                      새 노트
                    </span>
                  </div>
                </button>

                {/* 새 폴더 Button */}
                <button
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] rounded-[10px]"
                  style={{ background: 'rgba(185, 185, 185, 0.4)' }}
                >
                  <div className="flex items-center gap-1">
                    <Image
                      src="/대시보드/Text input-1.svg"
                      alt="새 폴더"
                      width={20}
                      height={20}
                    />
                    <span className="text-white font-bold text-sm leading-[17px] text-center font-['Inter']">
                      새 폴더
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Navigation Menu - padding: 12px, gap: 14px, border-bottom */}
            <div className="flex flex-col items-start py-3 px-3 gap-[14px] w-full border-b border-[#575757]">
              {/* 휴지통 */}
              <button
                onClick={() => router.push("/dashboard/trash")}
                className="flex items-center gap-2"
              >
                <Image
                  src="/대시보드/Text input-2.svg"
                  alt="휴지통"
                  width={20}
                  height={20}
                />
                <span className="text-white font-normal text-sm leading-[17px] font-['Inter']">
                  휴지통
                </span>
              </button>

              {/* 홈 */}
              <button
                onClick={() => {
                  onSelectFolder(null);
                  router.push("/dashboard/main");
                }}
                className="flex items-start gap-2"
              >
                <Image
                  src="/대시보드/Text input-3.svg"
                  alt="홈"
                  width={20}
                  height={20}
                />
                <span className="text-white font-normal text-sm leading-[17px] font-['Inter']">
                  홈
                </span>
              </button>

              {/* 즐겨찾기 */}
              <button
                onClick={() => router.push("/dashboard/favorites")}
                className="flex items-center gap-2 w-full"
              >
                <Image
                  src="/대시보드/Text input-4.svg"
                  alt="즐겨찾기"
                  width={20}
                  height={20}
                />
                <span className="text-white font-normal text-sm leading-[17px] font-['Inter']">
                  즐겨찾기
                </span>
              </button>
            </div>

            {/* Folder Section - padding: 12px 0px, gap: 8px */}
            <div className="flex flex-col items-start py-3 gap-2 w-full overflow-y-auto flex-1">
              {/* 폴더 Header */}
              <div className="flex justify-center items-center gap-2.5 w-[26px] h-[17px]">
                <span className="text-white font-bold text-sm leading-[17px] text-center font-['Inter']">
                  폴더
                </span>
              </div>

              {/* Folder Tree - gap: 4px */}
              <div className="flex flex-col items-start gap-1 w-full">
                <FolderTree
                  tree={buildFolderTree()}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={onSelectFolder}
                  onCreateSubFolder={handleCreateSubFolder}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onDeleteNote={handleDeleteNote}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Modals */}
      <NoteTypeSelectorModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={handleCreateNote}
        defaultFolderId={selectedFolderId}
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => {
          setIsCreateFolderModalOpen(false);
          setCreateSubfolderParentId(null);
        }}
        onCreate={async (name, parentId) => {
          const actualParentId = createSubfolderParentId || parentId;
          await handleCreateFolderModal(name, actualParentId);
          setCreateSubfolderParentId(null);
          setIsCreateFolderModalOpen(false);
        }}
        folderTree={buildFolderTree()}
      />

      {renamingFolder && (
        <RenameFolderModal
          isOpen={true}
          onClose={() => setRenamingFolder(null)}
          onRename={handleRenameSubmit}
          currentName={renamingFolder.name}
        />
      )}

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
