/**
 * PDF Controls Hook
 * Manages zoom, rotation, and page navigation
 */

"use client";

import { useState } from "react";
import { useNoteEditorStore } from "@/stores";

export function usePdfControls(numPages: number) {
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);

  const { currentPage, setCurrentPage } = useNoteEditorStore();

  // Page Navigation
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

  const handleZoomIn = () => { setScale((prev) => Math.min(prev + 0.25, 10)); };
  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const handleRotateLeft = () => { setRotation((prev) => (prev - 90) % 360); };
  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return {
    scale,
    setScale,
    rotation,
    currentPage,
    setCurrentPage,
    handlePrevPage,
    handleNextPage,
    handlePageInput,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleRotateLeft,
    handleRotateRight,
  };
}
