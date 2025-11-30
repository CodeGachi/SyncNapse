/**
 * 대시보드 사이드바 컴포넌트
 * 네비게이션, 폴더 트리, 노트 생성 기능 제공
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CreateFolderModal } from "@/components/dashboard/folder-management/create-folder-modal";
import { RenameFolderModal } from "@/components/dashboard/folder-management/rename-folder-modal";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { FolderTree } from "@/components/dashboard/folder-management/folder-tree";
import { NoteSettingsModal } from "@/components/dashboard/note-creation/create-note-modal";
import { useAuth } from "@/features/auth/use-auth";
import { useFolders } from "@/features/dashboard";
import { useDashboardSidebar } from "@/features/dashboard";
import { useDashboard } from "@/features/dashboard";

interface SidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function Sidebar({
  selectedFolderId,
  onSelectFolder,
}: SidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { buildFolderTree } = useFolders();
  const { handleCreateNote } = useDashboard();

  // UI 상태
  const [isNoteDropdownOpen, setIsNoteDropdownOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNoteType, setSelectedNoteType] = useState<"student" | "educator">("student");

  const {
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
    handleCreateFolderModal,
    handleCreateSubFolder,
    handleRenameFolder,
    handleRenameSubmit,
    handleDeleteFolder,
    handleDeleteSubmit,
    handleDeleteNote,
    handleDeleteNoteSubmit,
  } = useDashboardSidebar({
    selectedFolderId,
    onSelectFolder,
  });

  return (
    <>
      {/* Sidebar - width: 307px, bg: #121212 (Deep Premium Dark) */}
      <aside className="w-[307px] h-screen bg-[#121212] flex flex-col py-0 px-0 border-r border-white/5">
        {/* Card - padding: 0px 8px */}
        <div className="flex flex-col justify-between items-start px-2 py-0 w-full h-full">
          {/* Inner Card - padding: 4px 12px, gap: 8px */}
          <div className="flex flex-col items-start py-1 px-3 gap-2 w-full flex-1 overflow-hidden">
            {/* Top Section - padding: 12px 0px, gap: 18px, border-bottom */}
            <div className="flex flex-col items-start py-3 gap-[18px] w-full border-b border-white/5">
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

              {/* User Info - 클릭하면 마이페이지로 이동 */}
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="flex items-center gap-2 w-full h-[52px] hover:bg-white/5 rounded-xl transition-all duration-300 p-2 -ml-1 bg-white/5 border border-white/5 backdrop-blur-sm group"
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
                  <div className="text-white font-bold text-xl leading-6 font-['Inter']">
                    {user?.name || "사용자"}
                  </div>
                  <div className="text-white font-bold text-[8px] leading-[10px] font-['Inter']">
                    {user?.email || "user@example.com"}
                  </div>
                </div>
              </button>

              {/* Button Container - gap: 12px */}
              <div className="flex justify-center items-center gap-3 w-full">
                {/* 새 노트 Button - Expandable */}
                <div className="relative">
                  {/* Backdrop */}
                  {isNoteDropdownOpen && (
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNoteDropdownOpen(false)}
                    />
                  )}

                  {/* 새 노트 Button */}
                  <button
                    onClick={() => setIsNoteDropdownOpen(!isNoteDropdownOpen)}
                    className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] rounded-[12px] z-50 relative bg-gradient-to-br from-[#AFC02B] to-[#899649] shadow-[0_0_20px_rgba(175,192,43,0.3)] hover:shadow-[0_0_30px_rgba(175,192,43,0.5)] hover:scale-105 transition-all duration-300 border border-[#AFC02B]/50"
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

                  {/* Dropdown - absolute positioned, 불투명 배경, 구분선 추가 */}
                  {isNoteDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 w-[120px] rounded-[10px] overflow-hidden z-50 shadow-lg bg-[#6B7A2E]"
                    >
                      <button
                        onClick={() => {
                          setSelectedNoteType("student");
                          setIsNoteModalOpen(true);
                          setIsNoteDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-white text-xs hover:bg-white/20 transition-colors flex items-center gap-2"
                      >
                        {/* 개인 노트 아이콘 - 사람 */}
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="10" cy="6" r="4" stroke="white" strokeWidth="1.5" />
                          <path d="M3 18C3 14.134 6.13401 11 10 11C13.866 11 17 14.134 17 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        개인 노트
                      </button>
                      {/* 구분선 */}
                      <div className="mx-2 border-t border-white/30" />
                      <button
                        onClick={() => {
                          setSelectedNoteType("educator");
                          setIsNoteModalOpen(true);
                          setIsNoteDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-white text-xs hover:bg-white/20 transition-colors flex items-center gap-2"
                      >
                        {/* 강의 노트 아이콘 - 칠판 */}
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="2" y="3" width="16" height="11" rx="1" stroke="white" strokeWidth="1.5" />
                          <path d="M10 14V17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M6 17H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M6 7H10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M6 10H14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        강의 노트
                      </button>
                    </div>
                  )}
                </div>

                {/* 새 폴더 Button */}
                <button
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] rounded-[12px] bg-white/5 border border-white/10 hover:bg-white/10 hover:scale-105 transition-all duration-300"
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
            <div className="flex flex-col items-start py-3 px-3 gap-[14px] w-full border-b border-white/5">
              {/* 휴지통 */}
              <button
                onClick={() => router.push("/dashboard/trash")}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 hover:backdrop-blur-sm transition-all duration-200 group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 group-hover:opacity-100 transition-opacity">
                  <path d="M2.5 5H4.16667H17.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white/70 group-hover:text-white font-medium text-sm leading-[17px] font-['Inter'] transition-colors">
                  휴지통
                </span>
              </button>

              {/* 홈 */}
              <button
                onClick={() => {
                  onSelectFolder(null);
                  router.push("/dashboard/main");
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 hover:backdrop-blur-sm transition-all duration-200 group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 group-hover:opacity-100 transition-opacity">
                  <path d="M2.5 7.5L10 1.66667L17.5 7.5V16.6667C17.5 17.1087 17.3244 17.5326 17.0118 17.8452C16.6993 18.1577 16.2754 18.3333 15.8333 18.3333H4.16667C3.72464 18.3333 3.30072 18.1577 2.98816 17.8452C2.67559 17.5326 2.5 17.1087 2.5 16.6667V7.5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.5 18.3333V10H12.5V18.3333" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white/70 group-hover:text-white font-medium text-sm leading-[17px] font-['Inter'] transition-colors">
                  홈
                </span>
              </button>

              {/* 즐겨찾기 */}
              <button
                onClick={() => router.push("/dashboard/favorites")}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 hover:backdrop-blur-sm transition-all duration-200 group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 group-hover:opacity-100 transition-opacity">
                  <path d="M10 1.66667L12.575 6.88334L18.3333 7.725L14.1667 11.7833L15.15 17.5167L10 14.8083L4.85 17.5167L5.83333 11.7833L1.66667 7.725L7.425 6.88334L10 1.66667Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white/70 group-hover:text-white font-medium text-sm leading-[17px] font-['Inter'] transition-colors">
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

        </div>
      </aside>

      {/* Modals */}
      {isNoteModalOpen && (
        <NoteSettingsModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          onSubmit={handleCreateNote}
          defaultFolderId={selectedFolderId}
          noteType={selectedNoteType}
        />
      )}

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => {
          setIsCreateFolderModalOpen(false);
          setCreateSubfolderParentId(null);
        }}
        parentId={createSubfolderParentId}
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
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeletingFolder(null)}
          onDelete={handleDeleteSubmit}
          type="folder"
          name={deletingFolder.name}
        />
      )}

      {deletingNote && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeletingNote(null)}
          onDelete={handleDeleteNoteSubmit}
          type="note"
          name={deletingNote.title}
        />
      )}
    </>
  );
}
