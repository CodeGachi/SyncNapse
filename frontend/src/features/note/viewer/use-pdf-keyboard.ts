/**
 * PDF Keyboard Shortcuts Hook
 * Handles keyboard shortcuts for PDF navigation and zoom
 */

"use client";

import { useEffect } from "react";

interface UsePdfKeyboardProps {
  isPdf?: boolean;
  numPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number | ((prev: number) => number)) => void;
}

export function usePdfKeyboard({
  isPdf,
  numPages,
  currentPage,
  setCurrentPage,
  setScale,
}: UsePdfKeyboardProps) {
  useEffect(() => {
    if (!isPdf || !numPages) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field or editor
      const target = e.target as HTMLElement;
      const isTyping = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]') !== null;

      // Disable arrow key navigation when typing
      if (isTyping && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        return; // Let the editor handle arrow keys
      }

      switch (e.key) {
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }
          break;
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          if (currentPage < numPages) {
            setCurrentPage(currentPage + 1);
          }
          break;
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale((prev) => Math.min(prev + 0.25, 5));
          }
          break;
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale((prev) => Math.max(prev - 0.25, 0.5));
          }
          break;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale(1.5);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPdf, numPages, currentPage, setCurrentPage, setScale]);
}
