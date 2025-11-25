/**
 * 헤더 메뉴 - Dropdown Menu Component
 * 메뉴 아이콘 클릭 시 표시되는 드롭다운 메뉴
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFolders } from "@/features/dashboard";
import { useCreateNote, useUpdateNote } from "@/lib/api/mutations/notes.mutations";
import { useNote, useNotes } from "@/lib/api/queries/notes.queries";
import { FolderSelectorModal } from "@/components/dashboard/folder-management/folder-selector-modal";
import { NoteSettingsModal } from "@/components/dashboard/note-creation/create-note-modal";
import { Modal } from "@/components/common/modal";
import { KeyboardShortcutsModal } from "@/components/note/shared/keyboard-shortcuts-modal";
import type { Note, NoteData } from "@/lib/types";

interface HeaderMenuProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string | null;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function MenuItem({ icon, label, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-200 hover:bg-[#3f3f3f] transition-colors text-left"
    >
      <span className="w-5 h-5 flex items-center justify-center text-gray-400">
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

// 노트 선택 모달
interface NoteSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (noteId: string) => void;
  currentNoteId: string | null;
}

function NoteSelectModal({ isOpen, onClose, onSelect, currentNoteId }: NoteSelectModalProps) {
  const { data: notes = [], isLoading } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = notes.filter(
    (note) =>
      note.id !== currentNoteId &&
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-[60] transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-[60] flex items-center justify-center p-4"
      contentClassName="flex flex-col p-6 gap-4 bg-[#2F2F2F] rounded-[20px] w-[400px] max-h-[500px] border border-[#575757]"
      closeButton={false}
    >
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-xl text-white">노트 선택</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* 검색 입력 */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="노트 검색..."
        className="w-full px-4 py-2 bg-[#1e1e1e] border border-[#4f4f4f] rounded-lg text-white text-sm focus:outline-none focus:border-[#899649]"
      />

      {/* 노트 목록 */}
      <div className="flex-1 overflow-y-auto min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            로딩 중...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            {searchQuery ? "검색 결과가 없습니다" : "다른 노트가 없습니다"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => onSelect(note.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[#3f3f3f] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{note.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// 제목 수정 모달
interface TitleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  onSubmit: (newTitle: string) => void;
  isSubmitting: boolean;
}

function TitleEditModal({ isOpen, onClose, currentTitle, onSubmit, isSubmitting }: TitleEditModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentTitle]);

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit(title.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-[60] transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-[60] flex items-center justify-center p-4"
      contentClassName="flex flex-col p-6 gap-4 bg-[#2F2F2F] rounded-[20px] w-[400px] border border-[#575757]"
      closeButton={false}
    >
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-xl text-white">제목 수정</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="노트 제목"
        className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#4f4f4f] rounded-lg text-white focus:outline-none focus:border-[#899649]"
      />

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-5 py-2 bg-[#5E5E67] rounded-lg text-white hover:bg-[#6E6E77] transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
          className="px-5 py-2 bg-[#899649] rounded-lg text-white hover:bg-[#7A8740] transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "저장 중..." : "저장"}
        </button>
      </div>
    </Modal>
  );
}

export function HeaderMenu({ isOpen, onClose, noteId }: HeaderMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: note } = useNote(noteId, { enabled: !!noteId });
  const { buildFolderTree } = useFolders();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const [isNoteSelectModalOpen, setIsNoteSelectModalOpen] = useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isTitleEditModalOpen, setIsTitleEditModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // 메뉴 버튼 클릭은 무시 (버튼이 토글 처리함)
      if (target.closest('button[title="메뉴"]')) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 노트 이동 (다른 노트 선택)
  const handleNavigateToNote = () => {
    onClose();
    setIsNoteSelectModalOpen(true);
  };

  const handleNoteSelect = (selectedNoteId: string) => {
    setIsNoteSelectModalOpen(false);
    router.push(`/note?id=${selectedNoteId}`);
  };

  // 새 노트 만들기
  const handleCreateNote = () => {
    onClose();
    setIsCreateNoteModalOpen(true);
  };

  const handleNoteCreate = async (noteData: NoteData) => {
    createNote.mutate(
      {
        title: noteData.title,
        folderId: noteData.location,
        files: noteData.files,
        type: noteData.type,
      },
      {
        onSuccess: (newNote) => {
          setIsCreateNoteModalOpen(false);
          router.push(`/note?id=${newNote.id}`);
        },
      }
    );
  };

  // 노트 위치 옮기기 (폴더 변경)
  const handleMoveNote = () => {
    onClose();
    setIsFolderModalOpen(true);
  };

  const handleFolderSelect = (folderId: string) => {
    if (!noteId) return;

    updateNote.mutate(
      { noteId, updates: { folderId } },
      {
        onSuccess: () => {
          setIsFolderModalOpen(false);
        },
      }
    );
  };

  // 제목 수정
  const handleEditTitle = () => {
    onClose();
    setIsTitleEditModalOpen(true);
  };

  // 단축키 도움말
  const handleShowShortcuts = () => {
    onClose();
    setIsShortcutsModalOpen(true);
  };

  const handleTitleSubmit = (newTitle: string) => {
    if (!noteId) return;

    updateNote.mutate(
      { noteId, updates: { title: newTitle } },
      {
        onSuccess: () => {
          setIsTitleEditModalOpen(false);
        },
      }
    );
  };

  return (
    <>
      <div
        ref={menuRef}
        className="absolute top-14 left-14 w-[200px] bg-[#2f2f2f] border border-[#393939] rounded-[10px] shadow-lg z-50 overflow-hidden"
      >
        <div className="py-2">
          {/* 노트 이동 (다른 노트로) */}
          <MenuItem
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            }
            label="노트 이동"
            onClick={handleNavigateToNote}
          />

          {/* 새 노트 만들기 */}
          <MenuItem
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            }
            label="새 노트 만들기"
            onClick={handleCreateNote}
          />

          {/* 노트 위치 옮기기 */}
          <MenuItem
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <polyline points="9 14 12 17 15 14" />
              </svg>
            }
            label="노트 위치 옮기기"
            onClick={handleMoveNote}
          />

          {/* 제목 수정 */}
          <MenuItem
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            label="제목 수정"
            onClick={handleEditTitle}
          />

          {/* 구분선 */}
          <div className="my-1 mx-3 border-t border-[#4f4f4f]" />

          {/* 단축키 도움말 */}
          <MenuItem
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h8" />
              </svg>
            }
            label="단축키"
            onClick={handleShowShortcuts}
          />
        </div>
      </div>

      {/* 노트 선택 모달 */}
      <NoteSelectModal
        isOpen={isNoteSelectModalOpen}
        onClose={() => setIsNoteSelectModalOpen(false)}
        onSelect={handleNoteSelect}
        currentNoteId={noteId}
      />

      {/* 새 노트 생성 모달 */}
      <NoteSettingsModal
        isOpen={isCreateNoteModalOpen}
        onClose={() => setIsCreateNoteModalOpen(false)}
        onSubmit={handleNoteCreate}
        defaultFolderId={note?.folderId}
        noteType="student"
      />

      {/* 폴더 선택 모달 */}
      <FolderSelectorModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelect={handleFolderSelect}
        folderTree={buildFolderTree()}
        selectedFolderId={note?.folderId || "root"}
      />

      {/* 제목 수정 모달 */}
      <TitleEditModal
        isOpen={isTitleEditModalOpen}
        onClose={() => setIsTitleEditModalOpen(false)}
        currentTitle={note?.title || ""}
        onSubmit={handleTitleSubmit}
        isSubmitting={updateNote.isPending}
      />

      {/* 단축키 도움말 모달 */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </>
  );
}
