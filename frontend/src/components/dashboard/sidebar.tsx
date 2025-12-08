/**
 * 대시보드 사이드바 컴포넌트
 * 네비게이션, 폴더 트리, 노트 생성 기능 제공
 */

"use client";

import Image from "next/image";
import { Logo } from "@/components/common/logo";
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
  onCloseMobile?: () => void;
}

export function Sidebar({
  selectedFolderId,
  onSelectFolder,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();
  const { buildFolderTree } = useFolders();
  const { handleCreateNote } = useDashboard();

  const {
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
    createSubfolderParentId,
    renamingFolder,
    setRenamingFolder,
    deletingFolder,
    setDeletingFolder,
    deletingNote,
    setDeletingNote,
    setIsCreateFolderModalOpen,

    // 핸들러
    handleCreateSubFolder,
    handleRenameFolder,
    handleRenameSubmit,
    handleDeleteFolder,
    handleDeleteSubmit,
    handleDeleteNote,
    handleDeleteNoteSubmit,
    closeCreateFolderModal,
  } = useDashboardSidebar({
    selectedFolderId,
    onSelectFolder,
  });

  return (
    <>
      {/* Sidebar - width: 307px, bg: #121212 (Deep Premium Dark) */}
      <aside className="w-[280px] md:w-[307px] h-screen bg-background-sidebar flex flex-col py-0 px-0 border-r border-border-subtle relative">
        {/* 모바일/태블릿 닫기 버튼 */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="xl:hidden absolute top-4 right-4 p-2 text-foreground-tertiary hover:text-foreground hover:bg-foreground/10 rounded-lg transition-colors z-10"
            aria-label="사이드바 닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {/* Card - padding: 0px 8px */}
        <div className="flex flex-col justify-between items-start px-2 py-0 w-full h-full">
          {/* Inner Card - padding: 4px 12px, gap: 8px */}
          <div className="flex flex-col items-start py-1 px-3 gap-2 w-full flex-1 overflow-hidden">
            {/* Top Section - padding: 12px 0px, gap: 18px, border-bottom */}
            <div className="flex flex-col items-start py-3 gap-[18px] w-full border-b border-border-subtle">
              {/* Logo Container - gap: 8px */}
              <div className="flex items-center gap-2 h-[42px]">
                <Logo className="drop-shadow-[0_0_8px_rgba(0,0,0,0.25)] dark:drop-shadow-none" />
                <span className="text-foreground text-2xl font-bold leading-[29px] font-['Inter']">
                  SyncNapse
                </span>
              </div>

              {/* User Info - 클릭하면 마이페이지로 이동 */}
              <button
                onClick={navigateToProfile}
                className="flex items-center gap-2 w-full h-[52px] hover:bg-foreground/5 rounded-xl transition-all duration-300 p-2 -ml-1 bg-foreground/5 border border-border-subtle backdrop-blur-sm group"
              >
                {user?.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={36}
                    height={36}
                    className="w-9 h-9 border border-foreground"
                    style={{ borderRadius: '50%' }}
                  />
                ) : (
                  <div className="w-9 h-9 bg-foreground-tertiary border border-foreground flex items-center justify-center text-foreground font-bold"
                    style={{ borderRadius: '50%' }}>
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}

                <div className="flex flex-col gap-1 flex-1 text-left">
                  <div className="text-foreground font-bold text-xl leading-6 font-['Inter']">
                    {user?.name || "사용자"}
                  </div>
                  <div className="text-foreground font-bold text-[8px] leading-[10px] font-['Inter']">
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
                      onClick={closeNoteDropdown}
                    />
                  )}

                  {/* 새 노트 Button */}
                  <button
                    onClick={toggleNoteDropdown}
                    className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] rounded-[12px] z-50 relative bg-gradient-to-br from-brand to-brand-secondary shadow-[0_0_20px_rgba(175,192,43,0.3)] hover:shadow-[0_0_30px_rgba(175,192,43,0.5)] hover:scale-105 transition-all duration-300 border border-[#6B7A20] dark:border-brand"
                  >
                    <div className="flex items-center gap-1">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2.5C16 2.5 17.5 4 17.5 10C17.5 16 16 17.5 10 17.5C4 17.5 2.5 16 2.5 10C2.5 4 4 2.5 10 2.5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.5 10H7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 7.5V12.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-white font-bold text-sm leading-[17px] text-center font-['Inter']">
                        새 노트
                      </span>
                    </div>
                  </button>

                  {/* Dropdown - absolute positioned, 불투명 배경, 구분선 추가 */}
                  {isNoteDropdownOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 w-[120px] rounded-[10px] overflow-hidden z-50 shadow-lg bg-brand-secondary"
                    >
                      <button
                        onClick={() => openNoteModal("student")}
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
                        onClick={() => openNoteModal("educator")}
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
                  className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] rounded-[12px] bg-foreground/5 border border-border hover:bg-foreground/10 hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center gap-1 text-foreground">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M5.7164 1.04102C5.74119 1.04102 5.76632 1.04103 5.79179 1.04103L5.82262 1.04102C6.11547 1.04101 6.30393 1.041 6.48817 1.05822C7.28091 1.13236 8.03287 1.44382 8.64582 1.95196C8.78832 2.07006 8.92157 2.20332 9.12866 2.41042L9.60891 2.89076C10.3137 3.59551 10.5847 3.8586 10.8977 4.03272C11.0793 4.1338 11.272 4.21362 11.472 4.27061C11.8164 4.36879 12.194 4.37436 13.1907 4.37436H13.5445C14.6053 4.37435 15.4604 4.37433 16.137 4.4594C16.8382 4.54755 17.434 4.73566 17.9234 5.17589C18.0054 5.24961 18.0834 5.32763 18.1572 5.40961C18.5974 5.89906 18.7855 6.49484 18.8737 7.19602C18.9587 7.8726 18.9587 8.72776 18.9587 9.78851V11.713C18.9587 13.2445 18.9587 14.4575 18.8311 15.4068C18.6997 16.3839 18.4229 17.1747 17.7993 17.7983C17.1757 18.4219 16.3849 18.6988 15.4078 18.8301C14.4585 18.9577 13.2455 18.9577 11.714 18.9577H8.28667C6.75519 18.9577 5.54217 18.9577 4.59282 18.8301C3.6158 18.6988 2.82501 18.4219 2.20137 17.7983C1.57774 17.1747 1.30097 16.3839 1.16962 15.4068C1.04198 14.4575 1.04199 13.2445 1.04201 11.713V5.79081C1.04201 5.76534 1.042 5.74021 1.042 5.71542C1.04191 5.05216 1.04184 4.63006 1.11063 4.26547C1.41274 2.66425 2.66522 1.41176 4.26645 1.10966C4.63103 1.04086 5.05314 1.04093 5.7164 1.04102ZM5.79179 2.29103C5.02792 2.29103 4.7326 2.29376 4.49821 2.33798C3.40263 2.54469 2.54567 3.40166 2.33896 4.49723C2.29473 4.73162 2.29201 5.02695 2.29201 5.79081V11.666C2.29201 13.255 2.29333 14.3839 2.40847 15.2403C2.52119 16.0788 2.73258 16.5618 3.08526 16.9144C3.43793 17.2671 3.92097 17.4785 4.75938 17.5913C5.61577 17.7063 6.74466 17.7077 8.33366 17.7077H11.667C13.256 17.7077 14.3849 17.7063 15.2413 17.5913C16.0797 17.4785 16.5627 17.2671 16.9154 16.9144C17.2681 16.5618 17.4795 16.0788 17.5922 15.2403C17.7073 14.3839 17.7087 13.255 17.7087 11.666V9.83093C17.7087 8.71776 17.7075 7.94143 17.6334 7.35195C17.5612 6.77808 17.4287 6.46898 17.2277 6.24551C17.1835 6.19632 17.1367 6.14951 17.0875 6.10528C16.8641 5.90428 16.555 5.77178 15.9811 5.69963C15.3916 5.62552 14.6153 5.62436 13.5021 5.62436H13.1907C13.1597 5.62436 13.1291 5.62436 13.0988 5.62437C12.2255 5.62456 11.6623 5.62466 11.1293 5.47273C10.8371 5.38944 10.5554 5.27277 10.2899 5.12504C9.80557 4.85557 9.40741 4.45726 8.78999 3.83962C8.76866 3.81822 8.74699 3.79656 8.72507 3.77464L8.26652 3.31609C8.03046 3.08003 7.94014 2.99061 7.84808 2.91429C7.42868 2.56662 6.91419 2.35351 6.37179 2.30279C6.25273 2.29166 6.12564 2.29103 5.79179 2.29103ZM10.0003 9.37435C10.3455 9.37435 10.6253 9.65418 10.6253 9.99935V11.041H11.667C12.0122 11.041 12.292 11.3208 12.292 11.666C12.292 12.0112 12.0122 12.291 11.667 12.291H10.6253V13.3327C10.6253 13.6778 10.3455 13.9577 10.0003 13.9577C9.65516 13.9577 9.37532 13.6778 9.37532 13.3327V12.291H8.33366C7.98849 12.291 7.70867 12.0112 7.70867 11.666C7.70867 11.3208 7.98849 11.041 8.33366 11.041H9.37532V9.99935C9.37532 9.65418 9.65516 9.37435 10.0003 9.37435Z" fill="currentColor"/>
                    </svg>
                    <span className="text-foreground font-bold text-sm leading-[17px] text-center font-['Inter']">
                      새 폴더
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Navigation Menu - padding: 12px, gap: 14px, border-bottom */}
            <div className="flex flex-col items-start py-3 px-3 gap-[14px] w-full border-b border-border-subtle">
              {/* 휴지통 */}
              <button
                onClick={navigateToTrash}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-foreground/5 hover:backdrop-blur-sm transition-all duration-200 group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                  <path d="M2.5 5H4.16667H17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-foreground/70 group-hover:text-foreground font-medium text-sm leading-[17px] font-['Inter'] transition-colors">
                  휴지통
                </span>
              </button>

              {/* 홈 */}
              <button
                onClick={navigateToHome}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-foreground/5 hover:backdrop-blur-sm transition-all duration-200 group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                  <path d="M2.5 7.5L10 1.66667L17.5 7.5V16.6667C17.5 17.1087 17.3244 17.5326 17.0118 17.8452C16.6993 18.1577 16.2754 18.3333 15.8333 18.3333H4.16667C3.72464 18.3333 3.30072 18.1577 2.98816 17.8452C2.67559 17.5326 2.5 17.1087 2.5 16.6667V7.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.5 18.3333V10H12.5V18.3333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-foreground/70 group-hover:text-foreground font-medium text-sm leading-[17px] font-['Inter'] transition-colors">
                  홈
                </span>
              </button>
            </div>

            {/* Folder Section - padding: 12px 0px, gap: 8px */}
            <div className="flex flex-col items-start py-3 gap-2 w-full flex-1 min-h-0">
              {/* 폴더 Header */}
              <div className="flex items-center gap-2.5 h-[17px]">
                <span className="text-foreground font-bold text-sm leading-[17px] font-['Inter']">
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

            {/* 로그아웃 버튼 */}
            <div className="py-3 px-3 border-t border-border-subtle">
              <button
                onClick={navigateToLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-all duration-200 group"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground/70 group-hover:text-red-500 transition-colors">
                  <path d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.3333 14.1667L17.5 10L13.3333 5.83333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17.5 10H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-foreground/70 group-hover:text-red-500 font-medium text-sm leading-[17px] font-['Inter'] transition-colors">
                  로그아웃
                </span>
              </button>
            </div>
          </div>

        </div>
      </aside>

      {/* Modals */}
      {isNoteModalOpen && (
        <NoteSettingsModal
          isOpen={isNoteModalOpen}
          onClose={closeNoteModal}
          onSubmit={handleCreateNote}
          defaultFolderId={selectedFolderId}
          noteType={selectedNoteType}
        />
      )}

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={closeCreateFolderModal}
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
