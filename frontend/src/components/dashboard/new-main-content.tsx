/**
 * New Dashboard Main Content - Figma Design
 * 피그마 디자인 기반 메인 컨텐츠 (참고.css 스타일 적용)
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useFolders } from "@/features/dashboard";
import { useDashboardContext } from "@/providers/dashboard-context";
import type { Note, Folder } from "@/lib/types";

interface NewMainContentProps {
  selectedFolderId: string | null;
}

export function NewMainContent({ selectedFolderId }: NewMainContentProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { setSelectedFolderId } = useDashboardContext();

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

  // 날짜 포맷팅
  const formatDate = (dateString: string | number) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 노트 클릭 핸들러
  const handleNoteClick = (note: Note) => {
    const noteType = note.type || "student"; // 기본값은 student
    router.push(`/note/${noteType}/${note.id}`);
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
            className="flex-1 bg-transparent text-white text-xs font-bold leading-[15px] text-center outline-none placeholder:text-[#575757]"
          />
          <div className="w-[18px] h-[19.5px]">
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 13.5C10.5376 13.5 13 11.0376 13 8C13 4.96243 10.5376 2.5 7.5 2.5C4.46243 2.5 2 4.96243 2 8C2 11.0376 4.46243 13.5 7.5 13.5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L11.5 12.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Table Container - padding: 48px 36px, gap: 48px */}
      <div className="flex flex-col items-start px-9 py-12 gap-12 flex-1 bg-[#262626] overflow-y-auto">
        {/* 최근 접근한 노트 Section */}
        <div className="flex flex-col items-start gap-6 w-full">
          {/* Section Title */}
          <h2 className="text-white font-bold text-xl leading-6 text-center">
            최근 접근한 노트
          </h2>

          {/* Table Container - padding: 16px 0px, gap: 16px */}
          <div className="flex flex-col items-start py-4 px-0 gap-4 w-full bg-[#2F2F2F] border border-[#575757] rounded-[10px]">
            {/* Table Header */}
            <div className="flex flex-row items-center px-5 gap-6 w-full h-[19px]">
              <div className="flex-1 text-white font-medium text-base leading-[19px] text-center">
                이름
              </div>
              <div className="w-[278px] px-2.5 text-white font-medium text-base leading-[19px] text-center">
                위치
              </div>
              <div className="w-[19px]"></div>
            </div>

            {/* Divider */}
            <div className="w-full h-0 border-t border-[#575757]" />

            {/* Table Rows */}
            {isLoading ? (
              <div className="px-5 py-4 text-white text-center w-full">
                로딩 중...
              </div>
            ) : recentNotes.length === 0 ? (
              <div className="px-5 py-4 text-[#575757] text-center w-full">
                {searchQuery ? "검색 결과가 없습니다" : "최근 접근한 노트가 없습니다"}
              </div>
            ) : (
              recentNotes.map((note) => (
                <div key={note.id}>
                  <div
                    onClick={() => handleNoteClick(note)}
                    className="flex flex-row items-center px-5 gap-6 w-full h-5 cursor-pointer hover:bg-[#3A3A3A] transition-colors"
                  >
                    {/* Note Icon + Name */}
                    <div className="flex flex-row items-center gap-1 flex-1">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Image
                          src="/대시보드/Text input-5.svg"
                          alt="노트"
                          width={20}
                          height={20}
                        />
                      </div>
                      <span className="text-white font-normal text-sm leading-[17px]">
                        {note.title}
                      </span>
                    </div>

                    {/* Folder Location */}
                    <div className="w-[278px] px-2.5 text-[#575757] font-normal text-sm leading-[17px] text-center">
                      {getFolderName(note.folderId)}
                    </div>

                    {/* Favorite Icon */}
                    <div className="w-[19px] h-5 flex items-center justify-center">
                      {note.is_favorite && (
                        <Image
                          src="/대시보드/Text input-4.svg"
                          alt="즐겨찾기"
                          width={19}
                          height={20}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 선택된 폴더의 노트 Section (폴더 선택 시에만 표시) */}
        {selectedFolderId && (
          <div className="flex flex-col items-start gap-6 w-full">
            {/* 브레드크럼브 네비게이션 */}
            <div className="flex flex-row items-center gap-2">
              {breadcrumbPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-[#575757] text-xl font-bold">/</span>
                  )}
                  <button
                    onClick={() => handleFolderClick(folder.id)}
                    className={`text-xl font-bold transition-colors ${
                      index === breadcrumbPath.length - 1
                        ? "text-white cursor-default"
                        : "text-[#AFC02B] hover:text-[#C4D62E] cursor-pointer"
                    }`}
                    disabled={index === breadcrumbPath.length - 1}
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
                <div className="flex-1 text-white font-medium text-base leading-[19px] text-center">
                  이름
                </div>
                <div className="w-[278px] px-2.5 text-white font-medium text-base leading-[19px] text-center">
                  수정 날짜
                </div>
                <div className="w-[19px]"></div>
              </div>

              {/* Divider */}
              <div className="w-full h-0 border-t border-[#575757]" />

              {/* Table Rows - 폴더 먼저, 그 다음 노트 */}
              {childFolders.length === 0 && folderNotes.length === 0 ? (
                <div className="px-5 py-4 text-[#575757] text-center w-full">
                  {searchQuery ? "검색 결과가 없습니다" : "이 폴더가 비어있습니다"}
                </div>
              ) : (
                <>
                  {/* 폴더 목록 */}
                  {childFolders.map((folder) => (
                    <div key={folder.id}>
                      <div
                        onClick={() => handleFolderClick(folder.id)}
                        className="flex flex-row items-center px-5 gap-6 w-full h-5 cursor-pointer hover:bg-[#3A3A3A] transition-colors"
                      >
                        {/* Folder Icon + Name */}
                        <div className="flex flex-row items-center gap-1 flex-1">
                          <div className="w-5 h-5 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-[#AFC02B]"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                          </div>
                          <span className="text-white font-normal text-sm leading-[17px]">
                            {folder.name}
                          </span>
                        </div>

                        {/* Modified Date */}
                        <div className="w-[278px] px-2.5 text-[#575757] font-normal text-sm leading-[17px] text-center">
                          {formatDate(folder.updatedAt || folder.createdAt)}
                        </div>

                        {/* Empty space for alignment */}
                        <div className="w-[19px] h-5"></div>
                      </div>
                    </div>
                  ))}

                  {/* 노트 목록 */}
                  {folderNotes.map((note) => (
                    <div key={note.id}>
                      <div
                        onClick={() => handleNoteClick(note)}
                        className="flex flex-row items-center px-5 gap-6 w-full h-5 cursor-pointer hover:bg-[#3A3A3A] transition-colors"
                      >
                        {/* Note Icon + Name */}
                        <div className="flex flex-row items-center gap-1 flex-1">
                          <div className="w-5 h-5 flex items-center justify-center">
                            <Image
                              src="/대시보드/Text input-5.svg"
                              alt="노트"
                              width={20}
                              height={20}
                            />
                          </div>
                          <span className="text-white font-normal text-sm leading-[17px]">
                            {note.title}
                          </span>
                        </div>

                        {/* Modified Date */}
                        <div className="w-[278px] px-2.5 text-[#575757] font-normal text-sm leading-[17px] text-center">
                          {formatDate(note.updatedAt || note.createdAt)}
                        </div>

                        {/* Favorite Icon */}
                        <div className="w-[19px] h-5 flex items-center justify-center">
                          {note.is_favorite && (
                            <Image
                              src="/대시보드/Text input-4.svg"
                              alt="즐겨찾기"
                              width={19}
                              height={20}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
