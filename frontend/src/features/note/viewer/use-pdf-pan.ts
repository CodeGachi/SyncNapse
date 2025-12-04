/**
 * PDF 패닝 훅
 * PDF 뷰어의 팬/드래그 기능 관리
 */

"use client";

import { useState, useRef, RefObject } from "react";

export function usePdfPan(containerRef: RefObject<HTMLDivElement>) {
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      x: containerRef.current.scrollLeft,
      y: containerRef.current.scrollTop,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !containerRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    containerRef.current.scrollLeft = scrollStart.x - dx;
    containerRef.current.scrollTop = scrollStart.y - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  return {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
