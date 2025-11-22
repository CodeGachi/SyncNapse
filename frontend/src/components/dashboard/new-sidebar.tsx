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
      <aside className="w-[307px] h-screen bg-[#2F2F2F] flex flex-col py-0 px-0 border-r border-[#575757]">
        {/* Card - padding: 0px 8px */}
        <div className="flex flex-col justify-between items-start px-2 py-0 w-full h-full">
          {/* Inner Card - padding: 4px 12px, gap: 8px */}
          <div className="flex flex-col items-start py-1 px-3 gap-2 w-full flex-1 overflow-hidden">
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

              {/* User Info - gap: 8px (클릭하면 마이페이지로 이동) */}
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="flex items-center gap-2 w-full h-[38px] hover:bg-[#3C3C3C] rounded-lg transition-colors p-1 -ml-1"
              >
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

                <div className="flex flex-col gap-1 flex-1 text-left">
                  <div className="text-white font-bold text-xl leading-6 font-['Inter']"
                    style={{ textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)' }}>
                    {user?.name || "박태현"}
                  </div>
                  <div className="text-white font-bold text-[8px] leading-[10px] font-['Inter']">
                    {user?.email || "qkrxogus113@ajou.ac.kr"}
                  </div>
                </div>
              </button>

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
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 5H4.16667H17.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
                className="flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 7.5L10 1.66667L17.5 7.5V16.6667C17.5 17.1087 17.3244 17.5326 17.0118 17.8452C16.6993 18.1577 16.2754 18.3333 15.8333 18.3333H4.16667C3.72464 18.3333 3.30072 18.1577 2.98816 17.8452C2.67559 17.5326 2.5 17.1087 2.5 16.6667V7.5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.5 18.3333V10H12.5V18.3333" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-white font-normal text-sm leading-[17px] font-['Inter']">
                  홈
                </span>
              </button>

              {/* 즐겨찾기 */}
              <button
                onClick={() => router.push("/dashboard/favorites")}
                className="flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 1.66667L12.575 6.88334L18.3333 7.725L14.1667 11.7833L15.15 17.5167L10 14.8083L4.85 17.5167L5.83333 11.7833L1.66667 7.725L7.425 6.88334L10 1.66667Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-white font-normal text-sm leading-[17px] font-['Inter']">
                  즐겨찾기
                </span>
              </button>
            </div>

            {/* Folder Section - padding: 12px 0px, gap: 8px */}
            <div className="flex flex-col items-start py-3 gap-2 w-full flex-1 min-h-0">
              {/* 폴더 Header */}
              <div className="flex items-center gap-2.5 h-[17px]">
                <span className="text-white font-bold text-sm leading-[17px] font-['Inter']">
                  폴더
                </span>
              </div>

              {/* Folder Tree - gap: 4px */}
              <div className="flex flex-col items-start gap-1 w-full overflow-y-auto">
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

          {/* 하단 로그아웃 버튼 */}
          <div className="w-full px-3 py-4 border-t border-[#575757]">
            <button
              onClick={() => {
                // 로그아웃 처리 - window.location 사용하여 완전한 페이지 이동
                if (confirm('로그아웃 하시겠습니까?')) {
                  window.location.href = '/auth/logout';
                }
              }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#3C3C3C] rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.3333 14.1667L17.5 10L13.3333 5.83334" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17.5 10H7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-white font-normal text-sm leading-[17px] font-['Inter']">
                로그아웃
              </span>
            </button>
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
