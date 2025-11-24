/**
 * PDF Search Hook
 * PDF 내 텍스트 검색 기능 (Ctrl+F)
 */

"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

interface SearchMatch {
  pageNum: number;
  matchIndex: number;
  text: string;
}

interface UsePdfSearchProps {
  pdfDoc: any;
  numPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  textLayerRef: RefObject<HTMLDivElement | null>;
  isPdf?: boolean;
}

export function usePdfSearch({
  pdfDoc,
  numPages,
  currentPage,
  setCurrentPage,
  textLayerRef,
  isPdf,
}: UsePdfSearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // 검색창 열기/닫기 (Ctrl+F)
  useEffect(() => {
    if (!isPdf) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape" && isSearchOpen) {
        e.preventDefault();
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPdf, isSearchOpen]);

  // 검색 실행
  const performSearch = useCallback(async (query: string) => {
    if (!pdfDoc || !query.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      clearHighlights();
      return;
    }

    setIsSearching(true);
    const foundMatches: SearchMatch[] = [];
    const normalizedQuery = query.toLowerCase();

    try {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .toLowerCase();

        let startIndex = 0;
        let matchIndex = 0;
        while ((startIndex = pageText.indexOf(normalizedQuery, startIndex)) !== -1) {
          foundMatches.push({
            pageNum,
            matchIndex,
            text: query,
          });
          startIndex += normalizedQuery.length;
          matchIndex++;
        }
      }

      setMatches(foundMatches);
      setCurrentMatchIndex(0);

      if (foundMatches.length > 0) {
        // 첫 번째 매치가 있는 페이지로 이동
        setCurrentPage(foundMatches[0].pageNum);
      }
    } catch (err) {
      console.error("검색 실패:", err);
    } finally {
      setIsSearching(false);
    }
  }, [pdfDoc, numPages, setCurrentPage]);

  // 텍스트 레이어에서 하이라이트
  const highlightMatches = useCallback(() => {
    if (!textLayerRef.current || !searchQuery.trim()) return;

    const textLayer = textLayerRef.current;
    const spans = textLayer.querySelectorAll("span");

    // 먼저 모든 하이라이트 제거
    spans.forEach((span) => {
      span.innerHTML = span.textContent || "";
      span.classList.remove("search-highlight", "search-highlight-current");
    });

    if (!searchQuery.trim()) return;

    const normalizedQuery = searchQuery.toLowerCase();
    let currentPageMatchIndex = 0;

    // 현재 페이지의 매치 인덱스 계산
    const matchesBeforeCurrentPage = matches.filter(
      (m) => m.pageNum < currentPage
    ).length;
    const currentPageMatches = matches.filter(
      (m) => m.pageNum === currentPage
    );

    spans.forEach((span) => {
      const text = span.textContent || "";
      const lowerText = text.toLowerCase();

      if (lowerText.includes(normalizedQuery)) {
        const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, "gi");
        const parts = text.split(regex);

        span.innerHTML = parts
          .map((part) => {
            if (part.toLowerCase() === normalizedQuery) {
              const isCurrentMatch =
                matchesBeforeCurrentPage + currentPageMatchIndex === currentMatchIndex;
              currentPageMatchIndex++;
              return `<mark class="${
                isCurrentMatch ? "search-highlight-current" : "search-highlight"
              }">${part}</mark>`;
            }
            return part;
          })
          .join("");
      }
    });
  }, [textLayerRef, searchQuery, matches, currentPage, currentMatchIndex]);

  // 하이라이트 지우기
  const clearHighlights = useCallback(() => {
    if (!textLayerRef.current) return;

    const spans = textLayerRef.current.querySelectorAll("span");
    spans.forEach((span) => {
      span.innerHTML = span.textContent || "";
      span.classList.remove("search-highlight", "search-highlight-current");
    });
  }, [textLayerRef]);

  // 검색어 변경 시 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // 페이지 변경 또는 매치 인덱스 변경 시 하이라이트 업데이트
  useEffect(() => {
    // 텍스트 레이어 렌더링 후 하이라이트 적용을 위해 약간의 지연
    const timer = setTimeout(() => {
      highlightMatches();
    }, 100);

    return () => clearTimeout(timer);
  }, [currentPage, currentMatchIndex, highlightMatches]);

  // 다음 매치로 이동
  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);

    const match = matches[nextIndex];
    if (match.pageNum !== currentPage) {
      setCurrentPage(match.pageNum);
    }
  }, [matches, currentMatchIndex, currentPage, setCurrentPage]);

  // 이전 매치로 이동
  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return;

    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);

    const match = matches[prevIndex];
    if (match.pageNum !== currentPage) {
      setCurrentPage(match.pageNum);
    }
  }, [matches, currentMatchIndex, currentPage, setCurrentPage]);

  // 검색 닫기
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setMatches([]);
    setCurrentMatchIndex(0);
    clearHighlights();
  }, [clearHighlights]);

  return {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    matches,
    currentMatchIndex,
    isSearching,
    goToNextMatch,
    goToPrevMatch,
    closeSearch,
  };
}

// 정규식 특수문자 이스케이프
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
