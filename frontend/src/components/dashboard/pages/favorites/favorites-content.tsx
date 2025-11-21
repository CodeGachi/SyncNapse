/**
 * Favorites Content Component
 * 즐겨찾기 페이지 컨텐츠
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { useUpdateNote } from "@/lib/api/mutations/notes.mutations";
import { useFolders } from "@/features/dashboard";
import type { Note } from "@/lib/types";

export function FavoritesContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // 모든 노트 조회
  const { data: allNotes = [], isLoading } = useNotes();
  const updateNoteMutation = useUpdateNote();
  const { folders } = useFolders();

  // 즐겨찾기 노트만 필터링
  const favoriteNotes = useMemo(() => {
    return allNotes.filter((note) => note.is_favorite);
  }, [allNotes]);

  // 검색 필터링
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return favoriteNotes;

    const query = searchQuery.toLowerCase();
    return favoriteNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query)
    );
  }, [favoriteNotes, searchQuery]);

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

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (
    e: React.MouseEvent,
    note: Note
  ) => {
    e.stopPropagation(); // 노트 클릭 이벤트 방지

    try {
      await updateNoteMutation.mutateAsync({
        noteId: note.id,
        updates: {
          is_favorite: !note.is_favorite,
        },
      });
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen">
      {/* Search Bar Container */}
      <div className="flex flex-row justify-end items-center px-6 py-2.5 gap-6 h-[74px] bg-[#2F2F2F] border-b border-[#575757]">
        {/* Search Input */}
        <div className="flex flex-row items-center px-2.5 py-2.5 gap-2.5 w-[362px] h-[34px] bg-[#2F2F2F] border border-[#575757] rounded-lg">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-xs font-bold leading-[15px] text-center outline-none placeholder:text-[#575757]"
          />
          <div className="w-[18px] h-[19.5px]">
            <svg
              width="18"
              height="20"
              viewBox="0 0 18 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.5 13.5C10.5376 13.5 13 11.0376 13 8C13 4.96243 10.5376 2.5 7.5 2.5C4.46243 2.5 2 4.96243 2 8C2 11.0376 4.46243 13.5 7.5 13.5Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 17L11.5 12.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col items-start px-9 py-12 gap-12 flex-1 bg-[#262626] overflow-y-auto">
        {/* Favorites Section */}
        <div className="flex flex-col items-start gap-6 w-full">
          {/* Section Title */}
          <h2 className="text-white font-bold text-xl leading-6 text-center">
            즐겨찾기
          </h2>

          {/* Table Container */}
          <div className="flex flex-col items-start py-4 px-0 gap-4 w-full bg-[#2F2F2F] border border-[#575757] rounded-[10px]">
            {/* Table Header */}
            <div className="flex flex-row items-center px-5 gap-6 w-full h-[19px]">
              <div className="flex-1 text-white font-medium text-base leading-[19px] text-center">
                이름
              </div>
              <div className="w-[278px] px-2.5 text-white font-medium text-base leading-[19px] text-center">
                위치
              </div>
              <div className="w-[150px] px-2.5 text-white font-medium text-base leading-[19px] text-center">
                수정 날짜
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
            ) : filteredNotes.length === 0 ? (
              <div className="px-5 py-4 text-[#575757] text-center w-full">
                {searchQuery
                  ? "검색 결과가 없습니다"
                  : "즐겨찾기한 노트가 없습니다"}
              </div>
            ) : (
              filteredNotes.map((note) => (
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

                    {/* Modified Date */}
                    <div className="w-[150px] px-2.5 text-[#575757] font-normal text-sm leading-[17px] text-center">
                      {formatDate(note.updatedAt || note.createdAt)}
                    </div>

                    {/* Favorite Icon (clickable) */}
                    <div
                      className="w-[19px] h-5 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      onClick={(e) => handleToggleFavorite(e, note)}
                    >
                      <Image
                        src="/대시보드/Text input-4.svg"
                        alt="즐겨찾기"
                        width={19}
                        height={20}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
