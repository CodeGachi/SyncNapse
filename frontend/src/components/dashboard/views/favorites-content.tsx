/**
 * 즐겨찾기 페이지 컨텐츠 컴포넌트
 * 즐겨찾기된 노트 목록 표시 및 검색 기능 제공
 */

"use client";

import { LoadingScreen } from "@/components/common/loading-screen";
import { useFavorites } from "@/features/dashboard/views/use-favorites";
import { motion } from "framer-motion";
import { Search, Star, FileText, Folder, Clock } from "lucide-react";

export function FavoritesContent() {
  const {
    // 상태
    searchQuery,
    setSearchQuery,
    isLoading,

    // 데이터
    filteredNotes,

    // 핸들러
    handleNoteClick,
    handleToggleFavorite,

    // 유틸리티
    getFolderName,
    formatDate,
  } = useFavorites();

  if (isLoading) {
    return <LoadingScreen message="즐겨찾기를 불러오는 중..." />;
  }

  return (
    <main className="flex flex-col w-full h-screen overflow-y-auto p-8 bg-background-deep">
      <div className="max-w-6xl mx-auto w-full">
        {/* 헤더 - Glassmorphic */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-center justify-between mb-8 p-6 bg-background-modal/80 backdrop-blur-md border border-border-subtle rounded-2xl shadow-lg gap-4"
        >
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-foreground/5 rounded-xl">
              <Star className="w-8 h-8 text-brand fill-brand" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">즐겨찾기</h1>
              <p className="text-foreground-tertiary text-sm mt-1">자주 찾는 중요한 노트들을 모아보세요</p>
            </div>
          </div>

          {/* 검색 바 */}
          <div className="relative w-full md:w-[320px] group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-foreground-tertiary group-focus-within:text-brand transition-colors" />
            </div>
            <input
              type="text"
              placeholder="즐겨찾기 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 bg-background-surface/60 border border-border-subtle rounded-xl leading-5 text-foreground placeholder-foreground-tertiary focus:outline-none focus:bg-background-surface focus:border-brand focus:ring-1 focus:ring-brand sm:text-sm transition-all"
            />
          </div>
        </motion.div>

        {/* 컨텐츠 */}
        {filteredNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-20 bg-background-surface/40 rounded-2xl border border-border-subtle border-dashed"
          >
            <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="w-10 h-10 text-foreground-tertiary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground-secondary mb-2">
              {searchQuery ? "검색 결과가 없습니다" : "즐겨찾기한 노트가 없습니다"}
            </h3>
            <p className="text-sm text-foreground-tertiary">
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
                className="bg-background-surface/60 backdrop-blur-md hover:bg-background-surface/80 border border-border-subtle hover:border-border rounded-xl p-5 flex items-center justify-between transition-all group shadow-md hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  {/* 아이콘 */}
                  <div className="w-12 h-12 bg-gradient-to-br from-foreground/5 to-foreground/0 border border-border-subtle rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <FileText className="w-6 h-6 text-foreground-secondary group-hover:text-foreground transition-colors" />
                  </div>

                  {/* 노트 정보 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-semibold text-lg mb-1 truncate group-hover:text-brand transition-colors">
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-foreground-tertiary">
                      <span className="flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-foreground-tertiary" />
                        <span className="truncate max-w-[150px]">{getFolderName(note.folderId)}</span>
                      </span>
                      <span className="w-1 h-1 rounded-full bg-foreground-tertiary"></span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-foreground-tertiary" />
                        <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 즐겨찾기 토글 */}
                <button
                  onClick={(e) => handleToggleFavorite(e, note)}
                  className="p-3 rounded-full hover:bg-foreground/5 transition-colors group/star"
                >
                  <Star
                    className="w-6 h-6 text-brand fill-brand group-hover/star:scale-110 transition-transform filter drop-shadow-[0_0_8px_rgba(175,192,43,0.5)]"
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
