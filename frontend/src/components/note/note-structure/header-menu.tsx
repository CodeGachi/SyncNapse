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
import { Button } from "@/components/common/button";
import { KeyboardShortcutsModal } from "@/components/note/modals/keyboard-shortcuts-modal";
import type { Note, NoteData } from "@/lib/types";
import { LoadingScreen } from "@/components/common/loading-screen";

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
      className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground-secondary hover:bg-background-overlay transition-colors text-left"
    >
      <span className="w-5 h-5 flex items-center justify-center text-foreground-tertiary">
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
  currentFolderId?: string | null;
}

function NoteSelectModal({ isOpen, onClose, onSelect, currentNoteId, currentFolderId }: NoteSelectModalProps) {
  const { data: notes = [], isLoading } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const filteredNotes = notes.filter(
    (note) =>
      note.id !== currentNoteId &&
      (currentFolderId ? note.folderId === currentFolderId : true) && // 같은 폴더 내의 노트만 필터링
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedNoteId) {
      onSelect(selectedNoteId);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="노트 이동"
      contentClassName="bg-background-modal/90 border border-border-subtle shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-8 flex flex-col gap-6 w-[480px] max-h-[80vh]"
    >
      <div className="flex flex-col gap-6">
        {/* 검색 입력 */}
        <div className="relative w-full">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="노트 검색..."
            className="w-full pl-12 pr-4 py-3 bg-background-elevated border border-border rounded-xl text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all placeholder:text-foreground-tertiary"
          />
        </div>

        {/* 노트 목록 */}
        <div className="bg-background-elevated border border-border rounded-xl p-2 min-h-[280px] max-h-[350px] overflow-y-auto">
          {isLoading ? (
            <LoadingScreen message="로딩 중..." className="py-12" />
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-foreground-tertiary">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-sm">{searchQuery ? "검색 결과가 없습니다" : "같은 폴더 내에 다른 노트가 없습니다"}</span>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-all ${selectedNoteId === note.id
                    ? "bg-brand/30 text-foreground ring-1 ring-brand/50"
                    : "text-foreground-tertiary hover:bg-foreground/5 hover:text-foreground"
                    }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{note.title}</p>
                    <p className="text-xs text-foreground-tertiary mt-0.5">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedNoteId === note.id && (
                    <svg className="w-5 h-5 text-brand flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex flex-row justify-end items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="brand" onClick={handleConfirm} disabled={!selectedNoteId}>
            이동
          </Button>
        </div>
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
      title="제목 수정"
      contentClassName="bg-background-modal/90 border border-border-subtle shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-8 flex flex-col gap-6 w-[420px]"
    >
      <div className="flex flex-col gap-6">
        {/* 제목 입력 */}
        <div className="flex flex-col gap-2 w-full">
          <label className="text-sm text-foreground-secondary font-medium">노트 제목</label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="노트 제목을 입력하세요"
            className="w-full px-4 py-3 bg-background-elevated border border-border rounded-xl text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all placeholder:text-foreground-tertiary"
          />
        </div>

        {/* 하단 버튼 */}
        <div className="flex flex-row justify-end items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="brand"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </Button>
        </div>
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

  // 모달이 열려있는지 확인
  const isAnyModalOpen = isNoteSelectModalOpen || isCreateNoteModalOpen || isFolderModalOpen || isTitleEditModalOpen || isShortcutsModalOpen;

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

  // 메뉴도 닫혀있고 모달도 없으면 렌더링하지 않음
  if (!isOpen && !isAnyModalOpen) return null;

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
      {/* 드롭다운 메뉴 - isOpen일 때만 표시 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-14 left-14 w-[200px] bg-background-elevated border border-border rounded-[10px] shadow-lg z-50 overflow-hidden"
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
            <div className="my-1 mx-3 border-t border-border" />

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
      )}

      {/* 노트 선택 모달 */}
      <NoteSelectModal
        isOpen={isNoteSelectModalOpen}
        onClose={() => setIsNoteSelectModalOpen(false)}
        onSelect={handleNoteSelect}
        currentNoteId={noteId}
        currentFolderId={note?.folderId}
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
