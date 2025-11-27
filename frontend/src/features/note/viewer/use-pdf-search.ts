/**
 * PDF Search Hook
 * PDF 내 텍스트 검색 기능
 *
 * Note: 키보드 단축키(Ctrl+F, Escape)는 useNoteKeyboard로 이동됨
 */

"use client";

import { useState, useEffect, useCallback, useRef, RefObject } from "react";

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
}: UsePdfSearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // 하이라이트 적용 중인지 추적 (무한 루프 방지)
  const isHighlightingRef = useRef(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 하이라이트 지우기
  const clearHighlights = useCallback(() => {
    if (!textLayerRef.current) return;

    const marks = textLayerRef.current.querySelectorAll("mark");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize(); // 연속된 텍스트 노드 병합
      }
    });
  }, [textLayerRef]);

  // 텍스트 레이어에서 하이라이트 (간단한 버전)
  const highlightMatches = useCallback(() => {
    if (isHighlightingRef.current) return;
    if (!textLayerRef.current || !searchQuery.trim()) return;

    isHighlightingRef.current = true;

    try {
      const textLayer = textLayerRef.current;

      // 먼저 기존 하이라이트 제거
      clearHighlights();

      const normalizedQuery = searchQuery.toLowerCase();
      const currentPageMatches = matches.filter((m) => m.pageNum === currentPage);

      if (currentPageMatches.length === 0) {
        isHighlightingRef.current = false;
        return;
      }

      // 현재 페이지 이전의 매치 개수 계산
      const matchesBeforeCurrentPage = matches.filter(
        (m) => m.pageNum < currentPage
      ).length;

      const spans = textLayer.querySelectorAll("span");
      let pageMatchIndex = 0;

      spans.forEach((span) => {
        const text = span.textContent || "";
        const lowerText = text.toLowerCase();

        if (lowerText.includes(normalizedQuery)) {
          // TreeWalker를 사용하여 텍스트 노드 찾기
          const walker = document.createTreeWalker(
            span,
            NodeFilter.SHOW_TEXT,
            null
          );

          let node;
          const nodesToProcess: { node: Text; startIndex: number }[] = [];

          while ((node = walker.nextNode())) {
            const textNode = node as Text;
            const nodeText = textNode.textContent || "";
            const lowerNodeText = nodeText.toLowerCase();
            let searchIndex = 0;

            while ((searchIndex = lowerNodeText.indexOf(normalizedQuery, searchIndex)) !== -1) {
              nodesToProcess.push({ node: textNode, startIndex: searchIndex });
              searchIndex += normalizedQuery.length;
            }
          }

          // 역순으로 처리하여 인덱스가 변경되지 않도록
          for (let i = nodesToProcess.length - 1; i >= 0; i--) {
            const { node: textNode, startIndex } = nodesToProcess[i];
            const nodeText = textNode.textContent || "";

            const globalMatchIndex = matchesBeforeCurrentPage + pageMatchIndex;
            const isCurrentMatch = globalMatchIndex === currentMatchIndex;
            pageMatchIndex++;

            // 텍스트 노드 분할 및 mark 요소 생성
            const before = nodeText.substring(0, startIndex);
            const matched = nodeText.substring(startIndex, startIndex + searchQuery.length);
            const after = nodeText.substring(startIndex + searchQuery.length);

            const mark = document.createElement("mark");
            mark.className = isCurrentMatch ? "search-highlight-current" : "search-highlight";
            mark.textContent = matched;

            const parent = textNode.parentNode;
            if (parent) {
              if (after) {
                parent.insertBefore(document.createTextNode(after), textNode.nextSibling);
              }
              parent.insertBefore(mark, textNode.nextSibling);
              textNode.textContent = before;
            }
          }
        }
      });
    } finally {
      isHighlightingRef.current = false;
    }
  }, [textLayerRef, searchQuery, matches, currentPage, currentMatchIndex, clearHighlights]);

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
        setCurrentPage(foundMatches[0].pageNum);
      }
    } catch (err) {
      console.error("검색 실패:", err);
    } finally {
      setIsSearching(false);
    }
  }, [pdfDoc, numPages, setCurrentPage, clearHighlights]);

  // 검색어 변경 시 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // 페이지 변경 또는 매치 인덱스 변경 시 하이라이트 업데이트
  useEffect(() => {
    if (!searchQuery.trim()) return;

    // 기존 타이머 취소
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    // 텍스트 레이어 렌더링 완료를 기다린 후 하이라이트
    highlightTimeoutRef.current = setTimeout(() => {
      highlightMatches();
    }, 400);

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [currentPage, currentMatchIndex, searchQuery, highlightMatches]);

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
