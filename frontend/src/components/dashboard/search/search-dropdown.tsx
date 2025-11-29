/**
 * Search Dropdown Component
 * 검색 결과를 드롭다운으로 표시
 */

"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { decodeFilename } from "@/lib/utils/decode-filename";
import type {
  ApiSearchResponse,
  ApiSearchNoteResult,
  ApiSearchFileResult,
  ApiSearchSegmentResult,
} from "@/lib/api/types/api.types";

interface SearchDropdownProps {
  /** 검색 결과 */
  results: ApiSearchResponse;
  /** 검색어 (하이라이트용) */
  query: string;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 드롭다운 열림 상태 */
  isOpen: boolean;
  /** 드롭다운 닫기 함수 */
  onClose: () => void;
}

/**
 * 시간(초)을 MM:SS 형식으로 변환
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 텍스트에서 검색어를 하이라이트
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={index} className="text-[#AFC02B] font-semibold">
        {part}
      </span>
    ) : (
      part
    )
  );
}

/**
 * 카테고리 배지 컴포넌트
 */
function CategoryBadge({
  type,
}: {
  type: "note" | "file" | "segment";
}) {
  const config = {
    note: {
      label: "노트",
      bgColor: "bg-blue-500/20",
      textColor: "text-blue-400",
      borderColor: "border-blue-500/30",
    },
    file: {
      label: "파일",
      bgColor: "bg-purple-500/20",
      textColor: "text-purple-400",
      borderColor: "border-purple-500/30",
    },
    segment: {
      label: "음성",
      bgColor: "bg-orange-500/20",
      textColor: "text-orange-400",
      borderColor: "border-orange-500/30",
    },
  };

  const { label, bgColor, textColor, borderColor } = config[type];

  return (
    <span
      className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${bgColor} ${textColor} ${borderColor}`}
    >
      {label}
    </span>
  );
}

/**
 * 노트 검색 결과 아이템
 */
function NoteResultItem({
  item,
  query,
  onClick,
}: {
  item: ApiSearchNoteResult;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
    >
      <CategoryBadge type="note" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">
          {highlightText(item.title, query)}
        </p>
      </div>
    </button>
  );
}

/**
 * 파일 검색 결과 아이템
 */
function FileResultItem({
  item,
  query,
  onClick,
}: {
  item: ApiSearchFileResult;
  query: string;
  onClick: () => void;
}) {
  // Decode filename from Latin-1 to UTF-8 (for Korean filenames)
  const decodedTitle = decodeFilename(item.title);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
    >
      <CategoryBadge type="file" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">
          {highlightText(decodedTitle, query)}
        </p>
        <p className="text-gray-500 text-xs truncate">
          in &quot;{item.noteTitle}&quot;
        </p>
      </div>
    </button>
  );
}

/**
 * 음성 세그먼트 검색 결과 아이템
 */
function SegmentResultItem({
  item,
  query,
  onClick,
}: {
  item: ApiSearchSegmentResult;
  query: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors text-left"
    >
      <CategoryBadge type="segment" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">
          &quot;{highlightText(item.text, query)}&quot;
        </p>
        <p className="text-gray-500 text-xs truncate">
          {formatTime(item.startTime)} · {item.noteTitle || item.sessionTitle}
        </p>
      </div>
    </button>
  );
}

/**
 * 검색 결과 섹션
 */
function ResultSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-3 py-1.5 text-gray-400 text-xs font-medium">
        {icon}
        <span>
          {title} ({count})
        </span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function SearchDropdown({
  results,
  query,
  isLoading,
  isOpen,
  onClose,
}: SearchDropdownProps) {
  const router = useRouter();

  const totalResults =
    results.notes.length + results.files.length + results.segments.length;

  // 노트 클릭 핸들러
  const handleNoteClick = (note: ApiSearchNoteResult) => {
    router.push(`/note/student/${note.id}`);
    onClose();
  };

  // 파일 클릭 핸들러 (파일이 속한 노트로 이동)
  const handleFileClick = (file: ApiSearchFileResult) => {
    router.push(`/note/student/${file.noteId}`);
    onClose();
  };

  // 음성 세그먼트 클릭 핸들러 (노트로 이동 + 시간 파라미터)
  const handleSegmentClick = (segment: ApiSearchSegmentResult) => {
    router.push(`/note/student/${segment.noteId}?t=${segment.startTime}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 right-0 mt-2 bg-[#1E1E1E]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50"
        >
          <div className="max-h-[400px] overflow-y-auto">
            {/* 로딩 상태 */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-400">
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm">검색 중...</span>
                </div>
              </div>
            )}

            {/* 결과 없음 */}
            {!isLoading && totalResults === 0 && query.trim() && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <svg
                  className="w-10 h-10 mb-3 opacity-30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-sm">검색 결과가 없습니다</p>
                <p className="text-xs text-gray-600 mt-1">
                  다른 키워드로 검색해보세요
                </p>
              </div>
            )}

            {/* 검색 결과 */}
            {!isLoading && totalResults > 0 && (
              <div className="divide-y divide-white/5">
                {/* 노트 섹션 */}
                <ResultSection
                  title="노트"
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  }
                  count={results.notes.length}
                >
                  {results.notes.map((note) => (
                    <NoteResultItem
                      key={note.id}
                      item={note}
                      query={query}
                      onClick={() => handleNoteClick(note)}
                    />
                  ))}
                </ResultSection>

                {/* 파일 섹션 */}
                <ResultSection
                  title="파일"
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  }
                  count={results.files.length}
                >
                  {results.files.map((file) => (
                    <FileResultItem
                      key={file.id}
                      item={file}
                      query={query}
                      onClick={() => handleFileClick(file)}
                    />
                  ))}
                </ResultSection>

                {/* 음성 섹션 */}
                <ResultSection
                  title="음성"
                  icon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  }
                  count={results.segments.length}
                >
                  {results.segments.map((segment) => (
                    <SegmentResultItem
                      key={segment.id}
                      item={segment}
                      query={query}
                      onClick={() => handleSegmentClick(segment)}
                    />
                  ))}
                </ResultSection>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
