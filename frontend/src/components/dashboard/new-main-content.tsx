/**
 * New Dashboard Main Content - Figma Design
 * 피그마 디자인 기반 메인 컨텐츠 (참고.css 스타일 적용)
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useFolders } from "@/features/dashboard";
import { useDashboardContext } from "@/providers/dashboard-context";
import { updateNote, deleteNote } from "@/lib/api/services/notes.api";
import { renameFolder, deleteFolder, moveFolder } from "@/lib/api/services/folders.api";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { LoadingScreen } from "@/components/common/loading-screen";
import { DeleteConfirmModal } from "@/components/dashboard/delete-confirm-modal";
import { FolderSelector } from "@/components/dashboard/folder-management/folder-selector";
import { SearchDropdown } from "@/components/dashboard/search";
import { useSearch } from "@/features/search/use-search";
import { motion } from "framer-motion";
import type { Note, Folder } from "@/lib/types";

interface NewMainContentProps {
  selectedFolderId: string | null;
}

// 옵션 메뉴 타입
interface OptionMenu {
  type: 'note' | 'folder';
  id: string;
  position: { top: number; left: number };
}

// 이름 변경 모달 타입
interface RenameModal {
  type: 'note' | 'folder';
  id: string;
  currentName: string;
}

// 위치 이동 모달 타입
interface MoveModal {
  type: 'note' | 'folder';
  id: string;
  name: string;
}

// 삭제 모달 타입
interface DeleteModal {
  type: 'note' | 'folder';
  id: string;
  name: string;
}

export function NewMainContent({ selectedFolderId }: NewMainContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSelectedFolderId } = useDashboardContext();
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
  const { folders } = useFolders();

  // 현재 폴더의 하위 폴더들
  const childFolders = useMemo(() => {
    if (!selectedFolderId) return [];
    return folders.filter((f) => f.parentId === selectedFolderId);
  }, [folders, selectedFolderId]);

  // 폴더 클릭 핸들러
  const handleFolderClick = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  // 검색어가 없을 때만 전체 노트 표시 (검색 시에는 드롭다운에서 결과 표시)
  const filteredNotes = allNotes;

  // 최근 접근한 노트 (updated_at 기준 정렬, 최대 5개)
  const recentNotes = useMemo(() => {
    return [...filteredNotes]
      .sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [filteredNotes]);

  // 선택된 폴더의 노트
  const folderNotes = useMemo(() => {
    if (!selectedFolderId) return [];
    return filteredNotes.filter((note) => note.folderId === selectedFolderId);
  }, [filteredNotes, selectedFolderId]);

  // 날짜 포맷팅 - Figma: 2025/11/18 형식
  const formatDate = (dateString: string | number) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  // 노트 클릭 핸들러
  const handleNoteClick = (note: Note) => {
    const noteType = note.type || "student"; // 기본값은 student
    router.push(`/note/${noteType}/${note.id}`);
  };

  // 옵션 메뉴 열기
  const handleOptionClick = (e: React.MouseEvent, type: 'note' | 'folder', id: string) => {
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
  };

  // 옵션 메뉴 닫기
  const closeOptionMenu = () => {
    setOptionMenu(null);
  };

  // 이름 변경 핸들러
  const handleRename = async () => {
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
      console.error('이름 변경 실패:', error);
      alert('이름 변경에 실패했습니다.');
    }
  };

  // 삭제 핸들러 (모달 열기)
  const handleDelete = (type: 'note' | 'folder', id: string) => {
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
  };

  // 삭제 확인 핸들러
  const confirmDelete = async () => {
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
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 위치 이동 핸들러
  const handleMove = async () => {
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
      console.error('이동 실패:', error);
      alert('이동에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col w-full h-screen">
      {/* Search Bar Container - Floating Glass Pill Style */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute top-6 right-9 z-20 flex flex-row items-center gap-6"
      >
        {/* Search Input with Dropdown */}
        <div ref={searchContainerRef} className="relative">
          <div className={`flex flex-row items-center px-4 py-2.5 gap-3 w-[320px] h-[48px] bg-[#1E1E1E]/60 backdrop-blur-xl border rounded-full shadow-lg shadow-black/20 transition-all duration-300 group ${
            isSearchOpen && searchQuery.trim() ? 'border-[#AFC02B]/50' : 'border-white/10 hover:border-[#AFC02B]/30'
          }`}>
            <div className="w-5 h-5 flex items-center justify-center text-gray-400 group-hover:text-[#AFC02B] transition-colors">
              {isSearchLoading ? (
                <svg className="animate-spin w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 13.5C10.5376 13.5 13 11.0376 13 8C13 4.96243 10.5376 2.5 7.5 2.5C4.46243 2.5 2 4.96243 2 8C2 11.0376 4.46243 13.5 7.5 13.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17L11.5 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input
              type="text"
              placeholder="노트, 파일, 음성 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
              className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder:text-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {searchResults && (
            <SearchDropdown
              results={searchResults}
              query={searchQuery}
              isLoading={isSearchLoading}
              isOpen={isSearchOpen && searchQuery.trim().length > 0}
              onClose={() => setIsSearchOpen(false)}
            />
          )}
        </div>

        {/* 알림 아이콘 */}
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1E1E1E]/60 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </motion.div>

      {/* Main Content Container */}
      <div className="flex flex-col items-start px-9 py-12 gap-12 flex-1 bg-[#0A0A0A] overflow-y-auto pt-24">
        {/* 최근 접근한 노트 Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="flex flex-col items-start gap-6 w-full"
        >
          <h2 className="text-white font-bold text-xl leading-6">
            최근 접근한 노트
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {isLoading ? (
              <LoadingScreen message="노트를 불러오는 중..." className="py-8 col-span-full" />
            ) : recentNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-[#1E1E1E]/40 border border-white/5 rounded-2xl w-full col-span-full backdrop-blur-sm">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>최근 접근한 노트가 없습니다</p>
              </div>
            ) : (
              recentNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleNoteClick(note)}
                  className="group relative flex flex-col p-5 bg-[#1E1E1E]/60 backdrop-blur-md border border-white/5 rounded-2xl cursor-pointer hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:border-[#AFC02B]/30 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2.5 rounded-xl ${note.type === 'educator'
                      ? 'bg-[#AFC02B]/10 text-[#AFC02B] shadow-[0_0_10px_rgba(175,192,43,0.1)]'
                      : 'bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                      }`}>
                      {note.type === 'educator' ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleOptionClick(e, 'note', note.id)}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="12" cy="5" r="1" />
                        <circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                  </div>

                  <h3 className="text-white font-bold text-lg mb-1 truncate group-hover:text-[#AFC02B] transition-colors">
                    {note.title}
                  </h3>
                  <p className="text-gray-500 text-xs">
                    {formatDate(note.updatedAt || note.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Folder/Note List Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col items-start py-4 px-0 gap-4 w-full bg-[#1E1E1E]/40 backdrop-blur-sm border border-white/5 rounded-[10px]"
        >
          {/* Table Header */}
          <div className="flex flex-row items-center px-5 gap-6 w-full h-[19px]">
            <div className="flex-1 text-white font-medium text-base leading-[19px]">
              이름
            </div>
            <div className="w-[150px] text-white font-medium text-base leading-[19px] hidden sm:block flex-shrink-0">
              수정일
            </div>
            <div className="w-[24px] flex-shrink-0"></div>
          </div>

          {/* Divider */}
          <div className="w-full h-0 border-t border-white/5" />

          {/* Table Rows */}
          {childFolders.length === 0 && folderNotes.length === 0 ? (
            <div className="px-5 py-4 text-[#575757] w-full">
              이 폴더가 비어있습니다
            </div>
          ) : (
            <>
              {/* 노트 목록 */}
              {folderNotes.map((note) => (
                <div key={note.id} className="w-full">
                  <div
                    onClick={() => handleNoteClick(note)}
                    className="flex flex-row items-center px-5 gap-6 w-full h-10 cursor-pointer hover:bg-[#3A3A3A] transition-colors"
                  >
                    {/* Note Icon + Type Badge + Name */}
                    <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.6667 1.66667H5.00001C4.55798 1.66667 4.13406 1.84227 3.8215 2.15483C3.50894 2.46739 3.33334 2.89131 3.33334 3.33334V16.6667C3.33334 17.1087 3.50894 17.5326 3.8215 17.8452C4.13406 18.1577 4.55798 18.3333 5.00001 18.3333H15C15.442 18.3333 15.866 18.1577 16.1785 17.8452C16.4911 17.5326 16.6667 17.1087 16.6667 16.6667V6.66667L11.6667 1.66667Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M11.6667 1.66667V6.66667H16.6667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13.3333 10.8333H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13.3333 14.1667H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8.33332 7.5H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${note.type === 'educator'
                        ? 'bg-[#AFC02B]/20 text-[#AFC02B] border border-[#AFC02B]/30'
                        : 'bg-[#4A90D9]/20 text-[#4A90D9] border border-[#4A90D9]/30'
                        }`}>
                        {note.type === 'educator' ? '강의' : '개인'}
                      </span>
                      <span className="text-white font-normal text-base leading-[19px] truncate">
                        {note.title}
                      </span>
                    </div>

                    {/* 수정일 */}
                    <div className="w-[150px] text-white font-normal text-base leading-[19px] hidden sm:block flex-shrink-0">
                      {formatDate(note.updatedAt || note.createdAt)}
                    </div>

                    {/* 더보기 아이콘 */}
                    <button
                      onClick={(e) => handleOptionClick(e, 'note', note.id)}
                      className="w-[24px] h-6 flex items-center justify-center hover:bg-[#4A4A4A] rounded flex-shrink-0"
                    >
                      <svg width="4" height="16" viewBox="0 0 4 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2" cy="2" r="1.5" fill="white" />
                        <circle cx="2" cy="8" r="1.5" fill="white" />
                        <circle cx="2" cy="14" r="1.5" fill="white" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* 폴더 목록 */}
              {childFolders.map((folder) => (
                <div key={folder.id} className="w-full">
                  <div
                    onClick={() => handleFolderClick(folder.id)}
                    className="flex flex-row items-center px-5 gap-6 w-full h-10 cursor-pointer hover:bg-[#3A3A3A] transition-colors"
                  >
                    {/* Folder Icon + Name */}
                    <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.3333 15.8333C18.3333 16.2754 18.1577 16.6993 17.8452 17.0118C17.5326 17.3244 17.1087 17.5 16.6667 17.5H3.33334C2.89131 17.5 2.46739 17.3244 2.15483 17.0118C1.84227 16.6993 1.66667 16.2754 1.66667 15.8333V4.16667C1.66667 3.72464 1.84227 3.30072 2.15483 2.98816C2.46739 2.67559 2.89131 2.5 3.33334 2.5H7.5L9.16667 5H16.6667C17.1087 5 17.5326 5.17559 17.8452 5.48816C18.1577 5.80072 18.3333 6.22464 18.3333 6.66667V15.8333Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-white font-normal text-base leading-[19px] truncate">
                        {folder.name}
                      </span>
                    </div>

                    {/* 수정일 */}
                    <div className="w-[150px] text-white font-normal text-base leading-[19px] hidden sm:block flex-shrink-0">
                      {formatDate(folder.updatedAt || folder.createdAt)}
                    </div>

                    {/* 더보기 아이콘 */}
                    <button
                      onClick={(e) => handleOptionClick(e, 'folder', folder.id)}
                      className="w-[24px] h-6 flex items-center justify-center hover:bg-[#4A4A4A] rounded flex-shrink-0"
                    >
                      <svg width="4" height="16" viewBox="0 0 4 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2" cy="2" r="1.5" fill="white" />
                        <circle cx="2" cy="8" r="1.5" fill="white" />
                        <circle cx="2" cy="14" r="1.5" fill="white" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </motion.div>
      </div>

      {/* 옵션 메뉴 & 모달 */}
      {
        optionMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeOptionMenu} />
            <div
              className="fixed z-50 w-40 bg-[#1a1a1a]/90 border border-white/10 shadow-xl shadow-black/50 backdrop-blur-xl rounded-xl py-1"
              style={{
                top: optionMenu.position.top,
                left: optionMenu.position.left,
              }}
            >
              {/* 이름 변경 */}
              <button
                onClick={() => {
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
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                이름 변경
              </button>

              {/* 위치 이동 */}
              <button
                onClick={() => {
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
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                위치 이동
              </button>

              {/* 구분선 */}
              <div className="my-1 border-t border-white/10" />

              {/* 삭제 */}
              <button
                onClick={() => {
                  handleDelete(optionMenu.type, optionMenu.id);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                삭제
              </button>
            </div>
          </>
        )
      }

      {/* 이름 변경 모달 */}
      <Modal
        isOpen={!!renameModal}
        onClose={() => {
          setRenameModal(null);
          setNewName("");
        }}
        title={`${renameModal?.type === 'note' ? '노트' : '폴더'} 이름 변경`}
        contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-8 flex flex-col gap-6 w-[400px]"
      >
        <div className="flex flex-col gap-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-3 bg-[#262626] border border-[#575757] rounded-xl text-white outline-none focus:border-[#AFC02B] focus:ring-1 focus:ring-[#AFC02B] transition-all placeholder:text-gray-500"
            placeholder="새 이름 입력"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setRenameModal(null);
                setNewName("");
              }
            }}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setRenameModal(null);
                setNewName("");
              }}
            >
              취소
            </Button>
            <Button
              variant="brand"
              onClick={handleRename}
              disabled={!newName.trim()}
            >
              변경
            </Button>
          </div>
        </div>
      </Modal>

      {/* 위치 이동 모달 */}
      <Modal
        isOpen={!!moveModal}
        onClose={() => {
          setMoveModal(null);
          setSelectedMoveFolder(null);
        }}
        title={`"${moveModal?.name}" 이동`}
        contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-8 flex flex-col gap-6 w-[400px] max-h-[80vh]"
      >
        <div className="flex flex-col gap-6">
          <div className="bg-[#262626] border border-[#575757] rounded-xl p-2 max-h-[300px] overflow-y-auto space-y-1">
            {/* 루트 폴더 */}
            <button
              onClick={() => setSelectedMoveFolder(null)}
              className={`w-full px-3 py-2.5 text-left rounded-lg transition-all flex items-center gap-3 ${selectedMoveFolder === null
                ? 'bg-[#899649]/30 text-white ring-1 ring-[#899649]/50'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <div className="w-4 h-4" /> {/* Indent spacer */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-sm font-medium">Root</span>
            </button>

            {/* 폴더 트리 */}
            <FolderSelector
              tree={useFolders().buildFolderTree()}
              selectedFolderId={selectedMoveFolder}
              onSelectFolder={setSelectedMoveFolder}
              excludeFolderId={moveModal?.type === 'folder' ? moveModal.id : undefined}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setMoveModal(null);
                setSelectedMoveFolder(null);
              }}
            >
              취소
            </Button>
            <Button
              variant="brand"
              onClick={handleMove}
            >
              이동
            </Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      {
        deleteModal && (
          <DeleteConfirmModal
            isOpen={true}
            onClose={() => setDeleteModal(null)}
            onDelete={confirmDelete}
            type={deleteModal.type}
            name={deleteModal.name}
          />
        )
      }
    </div >
  );
}
