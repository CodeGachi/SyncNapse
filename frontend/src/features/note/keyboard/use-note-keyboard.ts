/**
 * 노트 페이지 통합 단축키 관리 훅
 * 모든 노트 관련 단축키를 한 곳에서 관리
 */

"use client";

import { useEffect, useCallback } from "react";
import type { DrawToolType } from "@/stores/draw-store";

interface UseNoteKeyboardProps {
  // PDF 관련
  isPdf?: boolean;
  numPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;

  // PDF 검색 관련
  isSearchOpen?: boolean;
  setIsSearchOpen?: (open: boolean) => void;
  closeSearch?: () => void;

  // PDF 썸네일/팬 모드
  isThumbnailOpen?: boolean;
  setIsThumbnailOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
  isPanModeEnabled?: boolean;
  setIsPanModeEnabled?: (enabled: boolean | ((prev: boolean) => boolean)) => void;

  // 패널 토글
  toggleNotePanel?: () => void;
  toggleScriptPanel?: () => void;
  toggleFilePanel?: () => void;
  toggleDrawingSidebar?: () => void;
  toggleChatbotPanel?: () => void;
  toggleCollaborationPanel?: () => void;

  // 필기 도구
  isDrawingEnabled?: boolean;
  setDrawingTool?: (tool: DrawToolType) => void;
  onUndo?: () => void;
  onRedo?: () => void;

  // 녹음/재생
  isPlaying?: boolean;
  togglePlay?: () => void;
  toggleRecording?: () => void;
  seekBackward?: () => void;
  seekForward?: () => void;

  // 저장
  onSave?: () => void;
}

/**
 * 입력 필드에서 타이핑 중인지 확인
 */
function isTypingInInput(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.contentEditable === "true" ||
    target.closest('[contenteditable="true"]') !== null
  );
}

export function useNoteKeyboard({
  // PDF
  isPdf = false,
  numPages,
  currentPage,
  setCurrentPage,
  setScale,
  // 검색
  isSearchOpen = false,
  setIsSearchOpen,
  closeSearch,
  // 썸네일/팬
  isThumbnailOpen,
  setIsThumbnailOpen,
  isPanModeEnabled,
  setIsPanModeEnabled,
  // 패널
  toggleNotePanel,
  toggleScriptPanel,
  toggleFilePanel,
  toggleDrawingSidebar,
  toggleChatbotPanel,
  toggleCollaborationPanel,
  // 필기
  isDrawingEnabled,
  setDrawingTool,
  onUndo,
  onRedo,
  // 녹음/재생
  isPlaying,
  togglePlay,
  toggleRecording,
  seekBackward,
  seekForward,
  // 저장
  onSave,
}: UseNoteKeyboardProps) {

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isTyping = isTypingInInput(e);
    const isCtrl = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;
    const isShift = e.shiftKey;

    // ============================================
    // 1. 검색 관련 (항상 동작)
    // ============================================

    // Ctrl + F: 검색창 열기
    if (isCtrl && e.key === "f" && isPdf) {
      e.preventDefault();
      setIsSearchOpen?.(true);
      return;
    }

    // Escape: 검색창 닫기
    if (e.key === "Escape" && isSearchOpen) {
      e.preventDefault();
      closeSearch?.();
      return;
    }

    // ============================================
    // 2. 저장 (항상 동작)
    // ============================================

    // Ctrl + S: 저장
    if (isCtrl && e.key === "s") {
      e.preventDefault();
      onSave?.();
      return;
    }

    // ============================================
    // 3. 실행 취소/다시 실행 (입력 필드 외)
    // ============================================

    if (!isTyping && isDrawingEnabled) {
      // Ctrl + Z: 실행 취소
      if (isCtrl && e.key === "z" && !isShift) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl + Shift + Z 또는 Ctrl + Y: 다시 실행
      if ((isCtrl && isShift && e.key === "z") || (isCtrl && e.key === "y")) {
        e.preventDefault();
        onRedo?.();
        return;
      }
    }

    // ============================================
    // 4. Alt + 숫자: 패널 토글
    // ============================================

    if (isAlt && !isTyping) {
      switch (e.key) {
        case "1":
          e.preventDefault();
          toggleNotePanel?.();
          return;
        case "2":
          e.preventDefault();
          toggleScriptPanel?.();
          return;
        case "3":
          e.preventDefault();
          toggleFilePanel?.();
          return;
        case "4":
          e.preventDefault();
          toggleDrawingSidebar?.();
          return;
        case "5":
          e.preventDefault();
          toggleChatbotPanel?.();
          return;
        case "6":
          e.preventDefault();
          toggleCollaborationPanel?.();
          return;
      }
    }

    // ============================================
    // 5. 필기 도구 단축키 (숫자 1~7, 입력 필드 외, 필기 활성화 시)
    // ============================================

    if (!isTyping && isDrawingEnabled && setDrawingTool && !isCtrl && !isAlt) {
      switch (e.key) {
        case "1":
          e.preventDefault();
          setDrawingTool("pen");
          return;
        case "2":
          e.preventDefault();
          setDrawingTool("highlighter");
          return;
        case "3":
          e.preventDefault();
          setDrawingTool("eraser");
          return;
        case "4":
          e.preventDefault();
          setDrawingTool("hand");
          return;
        case "5":
          e.preventDefault();
          setDrawingTool("solidLine");
          return;
        case "6":
          e.preventDefault();
          setDrawingTool("rect");
          return;
        case "7":
          e.preventDefault();
          setDrawingTool("circle");
          return;
      }
    }

    // ============================================
    // 6. PDF 네비게이션 (입력 필드 외)
    // ============================================

    if (!isTyping && isPdf && numPages > 0) {
      switch (e.key) {
        // 이전 페이지
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }
          return;

        // 다음 페이지
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          if (currentPage < numPages) {
            setCurrentPage(currentPage + 1);
          }
          return;

        // 첫 페이지
        case "Home":
          e.preventDefault();
          setCurrentPage(1);
          return;

        // 마지막 페이지
        case "End":
          e.preventDefault();
          setCurrentPage(numPages);
          return;

        // 썸네일 토글
        case "t":
        case "T":
          e.preventDefault();
          setIsThumbnailOpen?.((prev) => !prev);
          return;

        // 팬 모드 토글
        case "m":
        case "M":
          e.preventDefault();
          setIsPanModeEnabled?.((prev) => !prev);
          return;
      }

      // 줌 컨트롤 (Ctrl + 키)
      if (isCtrl) {
        switch (e.key) {
          case "+":
          case "=":
            e.preventDefault();
            setScale((prev) => Math.min(prev + 0.25, 5));
            return;
          case "-":
            e.preventDefault();
            setScale((prev) => Math.max(prev - 0.25, 0.5));
            return;
          case "0":
            e.preventDefault();
            setScale(1.0); // 피팅 크기로 리셋
            return;
        }
      }
    }

    // ============================================
    // 7. 재생 컨트롤 (입력 필드 외)
    // ============================================

    if (!isTyping) {
      // Space: 재생/일시정지
      if (e.key === " " && togglePlay) {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Ctrl + R: 녹음 시작/중지
      if (isCtrl && e.key === "r" && toggleRecording) {
        e.preventDefault();
        toggleRecording();
        return;
      }
    }

  }, [
    isPdf,
    numPages,
    currentPage,
    setCurrentPage,
    setScale,
    isSearchOpen,
    setIsSearchOpen,
    closeSearch,
    setIsThumbnailOpen,
    setIsPanModeEnabled,
    toggleNotePanel,
    toggleScriptPanel,
    toggleFilePanel,
    toggleDrawingSidebar,
    toggleChatbotPanel,
    toggleCollaborationPanel,
    isDrawingEnabled,
    setDrawingTool,
    onUndo,
    onRedo,
    togglePlay,
    toggleRecording,
    onSave,
  ]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * 단축키 목록 (도움말 표시용)
 */
export const NOTE_KEYBOARD_SHORTCUTS = {
  pdf: [
    { keys: ["←", "PageUp"], description: "이전 페이지" },
    { keys: ["→", "PageDown"], description: "다음 페이지" },
    { keys: ["Home"], description: "첫 페이지" },
    { keys: ["End"], description: "마지막 페이지" },
    { keys: ["Ctrl", "+"], description: "확대" },
    { keys: ["Ctrl", "-"], description: "축소" },
    { keys: ["Ctrl", "0"], description: "원본 크기" },
    { keys: ["Ctrl", "F"], description: "검색" },
    { keys: ["T"], description: "썸네일 토글" },
    { keys: ["M"], description: "이동 모드 토글" },
  ],
  panels: [
    { keys: ["Alt", "1"], description: "노트 패널" },
    { keys: ["Alt", "2"], description: "스크립트 패널" },
    { keys: ["Alt", "3"], description: "파일 패널" },
    { keys: ["Alt", "4"], description: "필기 도구" },
    { keys: ["Alt", "5"], description: "AI 챗봇" },
    { keys: ["Alt", "6"], description: "협업 패널" },
  ],
  drawing: [
    { keys: ["1"], description: "펜" },
    { keys: ["2"], description: "형광펜" },
    { keys: ["3"], description: "지우개" },
    { keys: ["4"], description: "선택" },
    { keys: ["5"], description: "직선" },
    { keys: ["6"], description: "사각형" },
    { keys: ["7"], description: "원" },
    { keys: ["Ctrl", "Z"], description: "실행 취소" },
    { keys: ["Ctrl", "Shift", "Z"], description: "다시 실행" },
  ],
  playback: [
    { keys: ["Space"], description: "재생/일시정지" },
    { keys: ["Ctrl", "R"], description: "녹음 시작/중지" },
  ],
  general: [
    { keys: ["Ctrl", "S"], description: "저장" },
    { keys: ["Escape"], description: "닫기/취소" },
  ],
} as const;
