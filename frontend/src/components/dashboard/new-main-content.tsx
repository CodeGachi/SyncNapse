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

export function NewMainContent({ selectedFolderId }: NewMainContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const { setSelectedFolderId } = useDashboardContext();

  // 옵션 메뉴 상태
  const [optionMenu, setOptionMenu] = useState<OptionMenu | null>(null);
  const [renameModal, setRenameModal] = useState<RenameModal | null>(null);
  const [moveModal, setMoveModal] = useState<MoveModal | null>(null);
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

  // 브레드크럼브 경로 계산
  const breadcrumbPath = useMemo(() => {
    if (!selectedFolderId) return [];

    const path: Folder[] = [];
    let currentId: string | null = selectedFolderId;

    while (currentId) {
      const folder = folders.find((f) => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }

    return path;
  }, [folders, selectedFolderId]);

  // 폴더 클릭 핸들러
  const handleFolderClick = (folderId: string) => {
    setSelectedFolderId(folderId);
  };

  // 검색 필터링
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return allNotes;

    const query = searchQuery.toLowerCase();
    return allNotes.filter((note) =>
      note.title.toLowerCase().includes(query)
    );
  }, [allNotes, searchQuery]);

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

  // 폴더 이름 가져오기
  const getFolderName = (folderId: string | null) => {
    if (!folderId) return "루트";
    const folder = folders.find((f) => f.id === folderId);
    return folder?.name || "알 수 없음";
  };

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

  // 삭제 핸들러
  const handleDelete = async (type: 'note' | 'folder', id: string) => {
    const confirmMessage = type === 'note'
      ? '이 노트를 삭제하시겠습니까?'
      : '이 폴더를 삭제하시겠습니까? 하위 항목도 모두 삭제됩니다.';

    if (!confirm(confirmMessage)) return;

    try {
      if (type === 'note') {
        await deleteNote(id);
      } else {
        await deleteFolder(id);
      }

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      window.dispatchEvent(new CustomEvent('folders-updated'));

      closeOptionMenu();
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
      {/* Search Bar Container - padding: 10px 24px, gap: 24px, height: 74px */}
      <div className="flex flex-row justify-end items-center px-6 py-2.5 gap-6 h-[74px] bg-[#2F2F2F] border-b border-[#575757]">
        {/* Search Input - width: 362px, height: 34px */}
        <div className="flex flex-row items-center px-2.5 py-2.5 gap-2.5 w-[362px] h-[34px] bg-[#2F2F2F] border border-[#575757] rounded-lg">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-xs font-bold leading-[15px] outline-none placeholder:text-[#575757]"
          />
          <div className="w-[18px] h-[19.5px]">
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 13.5C10.5376 13.5 13 11.0376 13 8C13 4.96243 10.5376 2.5 7.5 2.5C4.46243 2.5 2 4.96243 2 8C2 11.0376 4.46243 13.5 7.5 13.5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L11.5 12.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* 알림 아이콘 */}
        <button className="w-6 h-6 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Table Container - padding: 48px 36px, gap: 48px */}
      <div className="flex flex-col items-start px-9 py-12 gap-12 flex-1 bg-[#262626] overflow-y-auto">
        {/* 최근 접근한 노트 Section */}
        <div className="flex flex-col items-start gap-6 w-full">
          {/* Section Title */}
          <h2 className="text-white font-bold text-xl leading-6">
            최근 접근한 노트
          </h2>

          {/* Table Container - padding: 16px 0px, gap: 16px */}
          <div className="flex flex-col items-start py-4 px-0 gap-4 w-full bg-[#2F2F2F] border border-[#575757] rounded-[10px]">
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
            <div className="w-full h-0 border-t border-[#575757]" />

            {/* Table Rows */}
            {isLoading ? (
              <div className="px-5 py-4 text-white w-full">
                로딩 중...
              </div>
            ) : recentNotes.length === 0 ? (
              <div className="px-5 py-4 text-[#575757] w-full">
                {searchQuery ? "검색 결과가 없습니다" : "최근 접근한 노트가 없습니다"}
              </div>
            ) : (
              recentNotes.map((note) => (
                <div key={note.id} className="w-full">
                  <div
                    onClick={() => handleNoteClick(note)}
                    className="flex flex-row items-center px-5 gap-6 w-full h-10 cursor-pointer hover:bg-[#3A3A3A] transition-colors"
                  >
                    {/* Note Icon + Type Badge + Name */}
                    <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.6667 1.66667H5.00001C4.55798 1.66667 4.13406 1.84227 3.8215 2.15483C3.50894 2.46739 3.33334 2.89131 3.33334 3.33334V16.6667C3.33334 17.1087 3.50894 17.5326 3.8215 17.8452C4.13406 18.1577 4.55798 18.3333 5.00001 18.3333H15C15.442 18.3333 15.866 18.1577 16.1785 17.8452C16.4911 17.5326 16.6667 17.1087 16.6667 16.6667V6.66667L11.6667 1.66667Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M11.6667 1.66667V6.66667H16.6667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.3333 10.8333H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.3333 14.1667H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8.33332 7.5H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {/* 노트 타입 배지 */}
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                        note.type === 'educator'
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
                        <circle cx="2" cy="2" r="1.5" fill="white"/>
                        <circle cx="2" cy="8" r="1.5" fill="white"/>
                        <circle cx="2" cy="14" r="1.5" fill="white"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 선택된 폴더의 노트 Section (폴더 선택 시에만 표시) */}
        {selectedFolderId && (
          <div className="flex flex-col items-start gap-6 w-full">
            {/* 브레드크럼브 네비게이션 - Figma: 폴더1 / 폴더2 / 폴더3 */}
            <div className="flex flex-row items-center gap-2">
              {breadcrumbPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-white text-xl font-bold">/</span>
                  )}
                  <button
                    onClick={() => handleFolderClick(folder.id)}
                    className="text-white text-xl font-bold hover:text-[#AFC02B] transition-colors"
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* Table Container */}
            <div className="flex flex-col items-start py-4 px-0 gap-4 w-full bg-[#2F2F2F] border border-[#575757] rounded-[10px]">
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
              <div className="w-full h-0 border-t border-[#575757]" />

              {/* Table Rows - 폴더 먼저, 그 다음 노트 */}
              {childFolders.length === 0 && folderNotes.length === 0 ? (
                <div className="px-5 py-4 text-[#575757] w-full">
                  {searchQuery ? "검색 결과가 없습니다" : "이 폴더가 비어있습니다"}
                </div>
              ) : (
                <>
                  {/* 노트 목록 먼저 */}
                  {folderNotes.map((note) => (
                    <div key={note.id} className="w-full">
                      <div
                        onClick={() => handleNoteClick(note)}
                        className="flex flex-row items-center px-5 gap-6 w-full h-10 cursor-pointer hover:bg-[#3A3A3A] transition-colors"
                      >
                        {/* Note Icon + Type Badge + Name */}
                        <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.6667 1.66667H5.00001C4.55798 1.66667 4.13406 1.84227 3.8215 2.15483C3.50894 2.46739 3.33334 2.89131 3.33334 3.33334V16.6667C3.33334 17.1087 3.50894 17.5326 3.8215 17.8452C4.13406 18.1577 4.55798 18.3333 5.00001 18.3333H15C15.442 18.3333 15.866 18.1577 16.1785 17.8452C16.4911 17.5326 16.6667 17.1087 16.6667 16.6667V6.66667L11.6667 1.66667Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M11.6667 1.66667V6.66667H16.6667" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13.3333 10.8333H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M13.3333 14.1667H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8.33332 7.5H6.66666" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {/* 노트 타입 배지 */}
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${
                            note.type === 'educator'
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
                            <circle cx="2" cy="2" r="1.5" fill="white"/>
                            <circle cx="2" cy="8" r="1.5" fill="white"/>
                            <circle cx="2" cy="14" r="1.5" fill="white"/>
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
                            <path d="M18.3333 15.8333C18.3333 16.2754 18.1577 16.6993 17.8452 17.0118C17.5326 17.3244 17.1087 17.5 16.6667 17.5H3.33334C2.89131 17.5 2.46739 17.3244 2.15483 17.0118C1.84227 16.6993 1.66667 16.2754 1.66667 15.8333V4.16667C1.66667 3.72464 1.84227 3.30072 2.15483 2.98816C2.46739 2.67559 2.89131 2.5 3.33334 2.5H7.5L9.16667 5H16.6667C17.1087 5 17.5326 5.17559 17.8452 5.48816C18.1577 5.80072 18.3333 6.22464 18.3333 6.66667V15.8333Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                            <circle cx="2" cy="2" r="1.5" fill="white"/>
                            <circle cx="2" cy="8" r="1.5" fill="white"/>
                            <circle cx="2" cy="14" r="1.5" fill="white"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 옵션 메뉴 */}
      {optionMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeOptionMenu}
          />
          <div
            className="fixed z-50 w-40 bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg shadow-lg py-1"
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
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3C3C3C] hover:text-white transition-colors flex items-center gap-2"
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
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3C3C3C] hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              위치 이동
            </button>

            {/* 구분선 */}
            <div className="my-1 border-t border-[#3C3C3C]" />

            {/* 삭제 */}
            <button
              onClick={() => {
                handleDelete(optionMenu.type, optionMenu.id);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              삭제
            </button>
          </div>
        </>
      )}

      {/* 이름 변경 모달 */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg p-6 w-[400px]">
            <h3 className="text-white text-lg font-bold mb-4">
              {renameModal.type === 'note' ? '노트' : '폴더'} 이름 변경
            </h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-[#262626] border border-[#575757] rounded-lg text-white outline-none focus:border-[#AFC02B]"
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
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRenameModal(null);
                  setNewName("");
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRename}
                className="px-4 py-2 bg-[#AFC02B] text-black rounded-lg hover:bg-[#9FB025] transition-colors"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 위치 이동 모달 */}
      {moveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#2F2F2F] border border-[#3C3C3C] rounded-lg p-6 w-[400px] max-h-[500px]">
            <h3 className="text-white text-lg font-bold mb-4">
              &quot;{moveModal.name}&quot; 이동
            </h3>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {/* 루트 폴더 */}
              <button
                onClick={() => setSelectedMoveFolder(null)}
                className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center gap-2 ${
                  selectedMoveFolder === null
                    ? 'bg-[#6B7B3E] text-white'
                    : 'text-gray-300 hover:bg-[#3C3C3C]'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                루트
              </button>

              {/* 폴더 목록 (자기 자신과 하위 폴더 제외) */}
              {folders
                .filter(f => {
                  if (moveModal.type === 'folder') {
                    // 폴더 이동 시: 자기 자신과 하위 폴더 제외
                    if (f.id === moveModal.id) return false;
                    // 하위 폴더인지 확인 (간단한 체크)
                    let parentId = f.parentId;
                    while (parentId) {
                      if (parentId === moveModal.id) return false;
                      const parent = folders.find(pf => pf.id === parentId);
                      parentId = parent?.parentId || null;
                    }
                  }
                  return true;
                })
                .map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedMoveFolder(folder.id)}
                    className={`w-full px-3 py-2 text-left rounded-lg transition-colors flex items-center gap-2 ${
                      selectedMoveFolder === folder.id
                        ? 'bg-[#6B7B3E] text-white'
                        : 'text-gray-300 hover:bg-[#3C3C3C]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    {folder.name}
                  </button>
                ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setMoveModal(null);
                  setSelectedMoveFolder(null);
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleMove}
                className="px-4 py-2 bg-[#AFC02B] text-black rounded-lg hover:bg-[#9FB025] transition-colors"
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
