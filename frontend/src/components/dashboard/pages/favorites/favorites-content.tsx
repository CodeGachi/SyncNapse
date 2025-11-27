/**
 * Favorites Content Component
 * 즐겨찾기 페이지 컨텐츠
 */

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotes } from "@/lib/api/queries/notes.queries";
import { updateNote } from "@/lib/api/services/notes.api";
import { useFolders } from "@/features/dashboard";
import { LoadingScreen } from "@/components/common/loading-screen";
import type { Note } from "@/lib/types";
import { motion } from "framer-motion";
import { Search, Star, FileText, Folder, Clock } from "lucide-react";

export function FavoritesContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // 모든 노트 조회
  const { data: allNotes = [], isLoading } = useNotes();
  const { folders } = useFolders();

  // 노트 업데이트 뮤테이션
  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, updates }: { noteId: string; updates: Partial<Note> }) =>
      updateNote(noteId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

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

  if (isLoading) {
    return <LoadingScreen message="즐겨찾기를 불러오는 중..." />;
  }

  return (
    <main className="flex flex-col w-full h-screen overflow-y-auto p-8 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header - Glassmorphic */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-center justify-between mb-8 p-6 bg-[#1a1a1a]/80 backdrop-blur-md border border-white/5 rounded-2xl shadow-lg gap-4"
        >
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-white/5 rounded-xl">
              <Star className="w-8 h-8 text-[#AFC02B] fill-[#AFC02B]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">즐겨찾기</h1>
              <p className="text-gray-400 text-sm mt-1">자주 찾는 중요한 노트들을 모아보세요</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-[320px] group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500 group-focus-within:text-[#AFC02B] transition-colors" />
            </div>
            <input
              type="text"
              placeholder="즐겨찾기 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 bg-[#1E1E1E]/60 border border-white/10 rounded-xl leading-5 text-white placeholder-gray-500 focus:outline-none focus:bg-[#1E1E1E] focus:border-[#AFC02B] focus:ring-1 focus:ring-[#AFC02B] sm:text-sm transition-all"
            />
          </div>
        </motion.div>

        {/* Content */}
        {filteredNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-20 bg-[#1E1E1E]/40 rounded-2xl border border-white/5 border-dashed"
          >
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              {searchQuery ? "검색 결과가 없습니다" : "즐겨찾기한 노트가 없습니다"}
            </h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? "다른 검색어로 시도해보세요" : "중요한 노트에 별표를 눌러 추가해보세요"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => handleNoteClick(note)}
                className="bg-[#1E1E1E]/60 backdrop-blur-md hover:bg-[#1E1E1E]/80 border border-white/5 hover:border-white/10 rounded-xl p-5 flex items-center justify-between transition-all group shadow-md hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/0 border border-white/5 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" />
                  </div>

                  {/* Note Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg mb-1 truncate group-hover:text-[#AFC02B] transition-colors">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-gray-500" />
                        <span className="truncate max-w-[150px]">{getFolderName(note.folderId)}</span>
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorite Toggle */}
                <button
                  onClick={(e) => handleToggleFavorite(e, note)}
                  className="p-3 rounded-full hover:bg-white/5 transition-colors group/star"
                >
                  <Star
                    className="w-6 h-6 text-[#AFC02B] fill-[#AFC02B] group-hover/star:scale-110 transition-transform filter drop-shadow-[0_0_8px_rgba(175,192,43,0.5)]"
                  />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
