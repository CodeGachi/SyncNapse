/**
 * New Dashboard Sidebar - Figma Design Implementation
 * 피그마 디자인을 기반으로 한 새로운 대시보드 사이드바
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { NoteSettingsModal } from "@/components/dashboard/note-creation/create-note-modal";
import { CreateFolderModal } from "@/components/dashboard/folder-management/create-folder-modal";
import { RenameFolderModal } from "@/components/dashboard/folder-management/rename-folder-modal";
import { DeleteFolderModal } from "@/components/dashboard/folder-management/delete-folder-modal";
import { FolderTree } from "@/components/dashboard/folder-management/folder-tree";
import { useDashboard } from "@/features/dashboard";
import { useAuth } from "@/features/auth/use-auth";
import { useFolders } from "@/features/dashboard";
import { useDashboardSidebar } from "@/features/dashboard";

interface NewDashboardSidebarProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function NewDashboardSidebar({
  selectedFolderId,
  onSelectFolder,
}: NewDashboardSidebarProps) {
  const router = useRouter();
  const { handleCreateNote } = useDashboard();
  const { user } = useAuth();
  const { buildFolderTree } = useFolders();

  // UI 상태
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteCreationType, setNoteCreationType] = useState<"student" | "educator">("student");

  // 폴더 관련 상태와 핸들러
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

  // 새 노트 생성 핸들러
  const handleNewNoteClick = (type: "student" | "educator") => {
    setNoteCreationType(type);
    setIsNoteModalOpen(true);
  };

  return (
    <>
      {/* Sidebar - 피그마 디자인 적용 */}
      <aside className="w-[307px] h-screen bg-[#2F2F2F] flex flex-col p-0 border-r border-[#575757]">
        {/* Top Card - 프로필 및 버튼 영역 */}
        <div className="flex flex-col justify-center items-start px-2 py-0">
          <div className="flex flex-col items-start px-3 py-1 gap-2 w-full">
            {/* 로고 및 사용자 정보 컨테이너 */}
            <div className="flex flex-col items-start py-3 gap-[18px] w-full border-b border-[#575757]">
              {/* 로고 */}
              <div className="flex items-center gap-2 h-[42px]">
                <Image
                  src="/대시보드/Logo.svg"
                  alt="SyncNapse Logo"
                  width={42}
                  height={42}
                  className="flex-none"
                />
                <Link
                  href="/dashboard/main"
                  className="text-white text-2xl font-bold leading-[29px] hover:text-[#AFC02B] transition-colors"
                >
                  SyncNapse
                </Link>
              </div>

              {/* 사용자 정보 */}
              <div className="flex items-center gap-2 w-full h-[38px]">
                {user?.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={36}
                    height={36}
                    className="rounded-full border border-white"
                  />
                ) : (
                  <div className="w-9 h-9 bg-gray-500 rounded-full border border-white flex items-center justify-center text-white font-bold">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <div className="flex flex-col gap-1 flex-1">
                  <div className="text-white font-bold text-xl leading-6 drop-shadow-md">
                    {user?.name || "사용자"}
                  </div>
                  <div className="text-white font-bold text-xs leading-[10px]">
                    {user?.email || "user@example.com"}
                  </div>
                </div>
              </div>

              {/* 버튼 컨테이너 */}
              <div className="flex justify-center items-center gap-6 w-full h-[46px]">
                {/* 새 노트 버튼 */}
                <button
                  onClick={() => setIsNoteModalOpen(true)}
                  className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] bg-[rgba(175,192,43,0.4)] rounded-[10px] hover:bg-[rgba(175,192,43,0.6)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <Image
                      src="/대시보드/Text input.svg"
                      alt="새 노트"
                      width={20}
                      height={20}
                    />
                    <span className="text-white font-bold text-sm leading-[17px] text-center">
                      새 노트
                    </span>
                  </div>
                </button>

                {/* 새 폴더 버튼 */}
                <button
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="flex justify-center items-center gap-2.5 w-[120px] h-[46px] bg-[rgba(185,185,185,0.4)] rounded-[10px] hover:bg-[rgba(185,185,185,0.6)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <Image
                      src="/대시보드/Text input-1.svg"
                      alt="새 폴더"
                      width={20}
                      height={20}
                    />
                    <span className="text-white font-bold text-sm leading-[17px] text-center">
                      새 폴더
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 네비게이션 메뉴 */}
            <div className="flex flex-col items-start py-3 gap-[14px] w-full border-b border-[#575757]">
              {/* 휴지통 */}
              <button
                onClick={() => router.push("/dashboard/trash")}
                className="flex items-center gap-2 hover:text-white text-white transition-colors"
              >
                <Image
                  src="/대시보드/Text input-2.svg"
                  alt="휴지통"
                  width={20}
                  height={20}
                />
                <span className="font-normal text-sm leading-[17px]">휴지통</span>
              </button>

              {/* 홈 */}
              <button
                onClick={() => {
                  onSelectFolder(null);
                  router.push("/dashboard/main");
                }}
                className="flex items-start gap-2 hover:text-white text-white transition-colors"
              >
                <Image
                  src="/대시보드/Text input-3.svg"
                  alt="홈"
                  width={20}
                  height={20}
                />
                <span className="font-normal text-sm leading-[17px]">홈</span>
              </button>

              {/* 즐겨찾기 */}
              <button
                onClick={() => router.push("/dashboard/favorites")}
                className="flex items-center gap-2 hover:text-white text-white transition-colors w-full"
              >
                <Image
                  src="/대시보드/Text input-4.svg"
                  alt="즐겨찾기"
                  width={20}
                  height={20}
                />
                <span className="font-normal text-sm leading-[17px]">즐겨찾기</span>
              </button>

              {/* 최근 노트 - 제거됨 (요구사항에 따라) */}
            </div>

            {/* 폴더 섹션 */}
            <div className="flex flex-col items-start py-3 gap-2 w-full flex-1 overflow-y-auto">
              {/* 폴더 헤더 */}
              <div className="flex justify-center items-center gap-2.5">
                <span className="text-white font-bold text-sm leading-[17px] text-center">
                  폴더
                </span>
              </div>

              {/* 폴더 트리 */}
              <div className="flex flex-col items-start gap-1 w-full rounded-none">
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

      {/* 새 노트 생성 모달 - 개선된 버전 */}
      {isNoteModalOpen && (
        <NoteCreationModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          onSelectType={(type) => {
            setNoteCreationType(type);
          }}
          onSubmit={async (noteData) => {
            await handleCreateNote(noteData);
            setIsNoteModalOpen(false);
          }}
          defaultFolderId={selectedFolderId}
          noteType={noteCreationType}
        />
      )}

      {/* 폴더 생성 모달 */}
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

      {/* 폴더 이름 변경 모달 */}
      {renamingFolder && (
        <RenameFolderModal
          isOpen={true}
          onClose={() => setRenamingFolder(null)}
          onRename={handleRenameSubmit}
          currentName={renamingFolder.name}
        />
      )}

      {/* 폴더 삭제 모달 */}
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

/**
 * 새 노트 생성 모달 - 팝업 형태로 확장
 */
interface NoteCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: "student" | "educator") => void;
  onSubmit: (noteData: any) => Promise<void>;
  defaultFolderId: string | null;
  noteType: "student" | "educator";
}

function NoteCreationModal({
  isOpen,
  onClose,
  onSelectType,
  onSubmit,
  defaultFolderId,
  noteType,
}: NoteCreationModalProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(true);
  const [selectedType, setSelectedType] = useState<"student" | "educator" | null>(null);

  const handleTypeSelect = (type: "student" | "educator") => {
    setSelectedType(type);
    onSelectType(type);
    setShowTypeSelector(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2F2F2F] rounded-lg p-8 min-w-[400px]">
        {showTypeSelector ? (
          // 노트 타입 선택 화면
          <div className="flex flex-col gap-6">
            <h2 className="text-white text-xl font-bold text-center">
              노트 유형 선택
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleTypeSelect("student")}
                className="flex-1 flex flex-col items-center gap-4 p-6 bg-[rgba(175,192,43,0.4)] rounded-lg hover:bg-[rgba(175,192,43,0.6)] transition-colors"
              >
                <div className="text-white text-4xl">📝</div>
                <span className="text-white font-bold">개인 노트</span>
              </button>
              <button
                onClick={() => handleTypeSelect("educator")}
                className="flex-1 flex flex-col items-center gap-4 p-6 bg-[rgba(175,192,43,0.4)] rounded-lg hover:bg-[rgba(175,192,43,0.6)] transition-colors"
              >
                <div className="text-white text-4xl">🎓</div>
                <span className="text-white font-bold">강의 노트</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-center"
            >
              취소
            </button>
          </div>
        ) : (
          // 노트 생성 폼 (기존 모달 사용)
          <NoteSettingsModal
            isOpen={true}
            onClose={onClose}
            onSubmit={onSubmit}
            defaultFolderId={defaultFolderId}
            noteType={selectedType || noteType}
          />
        )}
      </div>
    </div>
  );
}
