/**
 * 검색 드롭다운 훅
 * search-dropdown.tsx에서 분리된 비즈니스 로직
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  LocalSearchResponse,
  LocalSearchNoteResult,
  LocalSearchFileResult,
  LocalSearchSegmentResult,
} from "@/features/search/use-search";

// 초기 표시 개수
const INITIAL_COUNT = 5;
// 더보기 클릭 시 추가 개수
const LOAD_MORE_COUNT = 5;

interface UseSearchDropdownProps {
  results: LocalSearchResponse;
  onClose: () => void;
}

export function useSearchDropdown({ results, onClose }: UseSearchDropdownProps) {
  const router = useRouter();

  // 각 카테고리별 표시 개수 상태
  const [visibleCounts, setVisibleCounts] = useState({
    notes: INITIAL_COUNT,
    files: INITIAL_COUNT,
    segments: INITIAL_COUNT,
  });

  // 총 결과 수 계산
  const totalResults =
    results.notes.length + results.files.length + results.segments.length;

  // 더보기 핸들러
  const showMore = useCallback((type: "notes" | "files" | "segments") => {
    setVisibleCounts((prev) => ({
      ...prev,
      [type]: prev[type] + LOAD_MORE_COUNT,
    }));
  }, []);

  // 노트 클릭 핸들러
  const handleNoteClick = useCallback((note: LocalSearchNoteResult) => {
    router.push(`/note/student/${note.id}`);
    onClose();
  }, [router, onClose]);

  // 파일 클릭 핸들러 (파일이 속한 노트로 이동)
  const handleFileClick = useCallback((file: LocalSearchFileResult) => {
    router.push(`/note/student/${file.noteId}`);
    onClose();
  }, [router, onClose]);

  // 음성 세그먼트 클릭 핸들러 (노트로 이동 + 시간 파라미터)
  const handleSegmentClick = useCallback((segment: LocalSearchSegmentResult) => {
    router.push(`/note/student/${segment.noteId}?t=${segment.startTime}`);
    onClose();
  }, [router, onClose]);

  return {
    // 상태
    visibleCounts,
    totalResults,

    // 핸들러
    showMore,
    handleNoteClick,
    handleFileClick,
    handleSegmentClick,
  };
}

/**
 * 시간(초)을 MM:SS 형식으로 변환
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * 텍스트에서 검색어를 하이라이트
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={index} className="text-brand font-semibold">
        {part}
      </span>
    ) : (
      part
    )
  );
}
