/**
 * 대시보드 메인 컨텐츠 훅
 * main-content.tsx에서 분리된 비즈니스 로직
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useFolders } from "@/features/dashboard";
import { useDashboardContext } from "@/providers/dashboard-context";
import { updateNote, deleteNote } from "@/lib/api/services/notes.api";
import { renameFolder, deleteFolder, moveFolder } from "@/lib/api/services/folders.api";
import { useSearch } from "@/features/search/use-search";
import { createLogger } from "@/lib/utils/logger";
import type { Note, Folder } from "@/lib/types";

const log = createLogger("MainContent");

// 옵션 메뉴 타입
export interface OptionMenu {
  type: 'note' | 'folder';
  id: string;
  position: { top: number; left: number };
}

// 이름 변경 모달 타입
export interface RenameModal {
  type: 'note' | 'folder';
  id: string;
  currentName: string;
}

// 위치 이동 모달 타입
export interface MoveModal {
  type: 'note' | 'folder';
  id: string;
  name: string;
}

// 삭제 모달 타입
export interface DeleteModal {
  type: 'note' | 'folder';
  id: string;
  name: string;
}

export function useMainContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { folders, isLoading: isFoldersLoading, buildFolderTree } = useFolders();

  // 첫 방문 시 Root 폴더 자동 선택
  useEffect(() => {
    if (!isFoldersLoading && selectedFolderId === null && folders.length > 0) {
      const rootFolder = folders.find(f => f.name === "Root" && f.parentId === null);
      if (rootFolder) {
        log.debug("Root 폴더 자동 선택:", rootFolder.id);
        setSelectedFolderId(rootFolder.id);
      }
    }
  }, [isFoldersLoading, selectedFolderId, folders, setSelectedFolderId]);

  // 통합 검색 훅
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    isOpen: isSearchOpen,
    setIsOpen: setIsSearchOpen,
    results: searchResults,
    isLoading: isSearchLoading,
  } = useSearch({ debounceDelay: 300, limit: 5 });

  // 검색창 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsSearchOpen]);

  // ESC 키로 검색 드롭다운 닫기
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  // 옵션 메뉴 상태
  const [optionMenu, setOptionMenu] = useState<OptionMenu | null>(null);
  const [renameModal, setRenameModal] = useState<RenameModal | null>(null);
  const [moveModal, setMoveModal] = useState<MoveModal | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModal | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string | null>(null);

  // 모든 노트 조회
  const { data: allNotes = [], isLoading } = useNotes();

  // 현재 폴더의 하위 폴더들
  const childFolders = useMemo(() => {
    if (!selectedFolderId) return [];
    return folders.filter((f) => f.parentId === selectedFolderId);
  }, [folders, selectedFolderId]);

  // 폴더 클릭 핸들러
  const handleFolderClick = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
  }, [setSelectedFolderId]);

  // 최근 접근한 노트 (updated_at 기준 정렬, 최대 5개)
  const recentNotes = useMemo(() => {
    return [...allNotes]
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [allNotes]);

  // 선택된 폴더의 노트
  const folderNotes = useMemo(() => {
    if (!selectedFolderId) return [];
    return allNotes.filter((note) => note.folderId === selectedFolderId);
  }, [allNotes, selectedFolderId]);

  // 날짜 포맷팅 - 2025/11/18 형식
  const formatDate = useCallback((dateString: string | number) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }, []);

  // 노트 클릭 핸들러
  const handleNoteClick = useCallback((note: Note) => {
    const noteType = note.type || "student";
    router.push(`/note/${noteType}/${note.id}`);
  }, [router]);

  // 옵션 메뉴 열기
  const handleOptionClick = useCallback((e: React.MouseEvent, type: 'note' | 'folder', id: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setOptionMenu({
      type,
      id,
      position: {
        top: rect.bottom + 4,
        left: rect.right - 160,
      },
    });
  }, []);

  // 옵션 메뉴 닫기
  const closeOptionMenu = useCallback(() => {
    setOptionMenu(null);
  }, []);

  // 이름 변경 모달 열기
  const openRenameModal = useCallback(() => {
    if (!optionMenu) return;

    const item = optionMenu.type === 'note'
      ? allNotes.find(n => n.id === optionMenu.id)
      : folders.find(f => f.id === optionMenu.id);

    if (item) {
      setRenameModal({
        type: optionMenu.type,
        id: optionMenu.id,
        currentName: 'title' in item ? item.title : item.name,
      });
      setNewName('title' in item ? item.title : item.name);
    }
    closeOptionMenu();
  }, [optionMenu, allNotes, folders, closeOptionMenu]);

  // 이름 변경 핸들러
  const handleRename = useCallback(async () => {
    if (!renameModal || !newName.trim()) return;

    try {
      if (renameModal.type === 'note') {
        await updateNote(renameModal.id, { title: newName.trim() });
      } else {
        await renameFolder(renameModal.id, newName.trim());
      }

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      window.dispatchEvent(new CustomEvent('folders-updated'));

      setRenameModal(null);
      setNewName("");
    } catch (error) {
      log.error('이름 변경 실패:', error);
      alert('이름 변경에 실패했습니다.');
    }
  }, [renameModal, newName, queryClient]);

  // 이름 변경 모달 닫기
  const closeRenameModal = useCallback(() => {
    setRenameModal(null);
    setNewName("");
  }, []);

  // 이동 모달 열기
  const openMoveModal = useCallback(() => {
    if (!optionMenu) return;

    const item = optionMenu.type === 'note'
      ? allNotes.find(n => n.id === optionMenu.id)
      : folders.find(f => f.id === optionMenu.id);

    if (item) {
      setMoveModal({
        type: optionMenu.type,
        id: optionMenu.id,
        name: 'title' in item ? item.title : item.name,
      });
      setSelectedMoveFolder(
        optionMenu.type === 'note'
          ? (item as Note).folderId || null
          : (item as Folder).parentId || null
      );
    }
    closeOptionMenu();
  }, [optionMenu, allNotes, folders, closeOptionMenu]);

  // 삭제 핸들러 (모달 열기)
  const handleDelete = useCallback((type: 'note' | 'folder', id: string) => {
    const item = type === 'note'
      ? allNotes.find(n => n.id === id)
      : folders.find(f => f.id === id);

    if (item) {
      setDeleteModal({
        type,
        id,
        name: 'title' in item ? item.title : item.name,
      });
      closeOptionMenu();
    }
  }, [allNotes, folders, closeOptionMenu]);

  // 삭제 확인 핸들러
  const confirmDelete = useCallback(async () => {
    if (!deleteModal) return;

    try {
      if (deleteModal.type === 'note') {
        await deleteNote(deleteModal.id);
      } else {
        await deleteFolder(deleteModal.id);
      }

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      window.dispatchEvent(new CustomEvent('folders-updated'));

      setDeleteModal(null);
    } catch (error) {
      log.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  }, [deleteModal, queryClient]);

  // 삭제 모달 닫기
  const closeDeleteModal = useCallback(() => {
    setDeleteModal(null);
  }, []);

  // 위치 이동 핸들러
  const handleMove = useCallback(async () => {
    if (!moveModal) return;

    try {
      if (moveModal.type === 'note') {
        await updateNote(moveModal.id, { folderId: selectedMoveFolder || undefined });
      } else {
        await moveFolder(moveModal.id, selectedMoveFolder);
      }

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      window.dispatchEvent(new CustomEvent('folders-updated'));

      setMoveModal(null);
      setSelectedMoveFolder(null);
    } catch (error) {
      log.error('이동 실패:', error);
      alert('이동에 실패했습니다.');
    }
  }, [moveModal, selectedMoveFolder, queryClient]);

  // 이동 모달 닫기
  const closeMoveModal = useCallback(() => {
    setMoveModal(null);
    setSelectedMoveFolder(null);
  }, []);

  return {
    // Refs
    searchContainerRef,

    // 로딩 상태
    isLoading,
    isFoldersLoading,

    // 검색 관련
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    searchResults,
    isSearchLoading,

    // 데이터
    allNotes,
    folders,
    childFolders,
    recentNotes,
    folderNotes,
    buildFolderTree,

    // 모달 상태
    optionMenu,
    renameModal,
    moveModal,
    deleteModal,
    newName,
    setNewName,
    selectedMoveFolder,
    setSelectedMoveFolder,

    // 핸들러
    handleFolderClick,
    handleNoteClick,
    handleOptionClick,
    closeOptionMenu,
    openRenameModal,
    handleRename,
    closeRenameModal,
    openMoveModal,
    handleMove,
    closeMoveModal,
    handleDelete,
    confirmDelete,
    closeDeleteModal,

    // 유틸리티
    formatDate,
  };
}
