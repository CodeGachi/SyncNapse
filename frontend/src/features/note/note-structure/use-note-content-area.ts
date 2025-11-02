/**
 * NoteContentArea Hook
 * viewerHeight, isDragging, resize/drag 핸들러, 탭 관리 로직
 */

import { useState, useEffect, useRef } from "react";
import type { FileItem } from "@/features/note/file/use-file-panel";

interface UseNoteContentAreaProps {
  openedFiles: FileItem[];
  setActiveTab: (index: number) => void;
  selectFile: (fileId: string) => void;
  closeTab: (fileId: string) => void;
}

export function useNoteContentArea({
  openedFiles,
  setActiveTab,
  selectFile,
  closeTab,
}: UseNoteContentAreaProps) {
  const [showExpandButton, setShowExpandButton] = useState(true);
  const [viewerHeight, setViewerHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 화면 크기 감지하여 확장 버튼 표시 여부 결정
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 1200;
      setShowExpandButton(window.innerWidth >= minWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // 드래그 핸들러
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newHeight =
        ((e.clientY - containerRect.top) / containerRect.height) * 100;

      // 최소 30%, 최대 70%로 제한
      const clampedHeight = Math.max(30, Math.min(70, newHeight));
      setViewerHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // 탭 변경 시 파일도 선택
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (openedFiles[index]) {
      selectFile(openedFiles[index].id);
    }
  };

  // 탭 닫기 (탭에서만 제거, 파일은 유지)
  const handleTabClose = (index: number) => {
    const fileToClose = openedFiles[index];
    if (fileToClose) {
      closeTab(fileToClose.id);
    }
  };

  // 탭용 파일 형식으로 변환
  const convertFilesForTabs = () => {
    return openedFiles.map((file, index) => ({
      id: index + 1,
      name: file.name,
    }));
  };

  return {
    showExpandButton,
    viewerHeight,
    isDragging,
    containerRef,
    setIsDragging,
    handleTabChange,
    handleTabClose,
    convertFilesForTabs,
  };
}
