/**
 * 파일 패널 비즈니스 로직 훅
 */

import { useState, useRef, useEffect } from "react";
import type { FileItem } from "../types";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  fileId: string | null;
}

interface UseFilePanelProps {
  files: FileItem[];
  onAddFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onCopyFile?: (id: string) => void;
}

export function useFilePanel({
  files,
  onAddFile,
  onRemoveFile,
  onRenameFile,
  onCopyFile,
}: UseFilePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    fileId: null,
  });
  const [focusedFileId, setFocusedFileId] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // 파일 추가 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach((file) => {
        onAddFile(file);
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 컨텍스트 메뉴 열기
  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      fileId,
    });
  };

  // 파일 삭제
  const handleDelete = (fileId: string) => {
    onRemoveFile(fileId);
    setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
  };

  // 파일 이름 변경 시작
  const handleRename = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      setRenamingFileId(fileId);
      setRenameValue(file.name);
      setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
    }
  };

  // 파일 이름 변경 완료
  const handleRenameSubmit = (fileId: string) => {
    if (renameValue.trim() && onRenameFile) {
      onRenameFile(fileId, renameValue.trim());
    }
    setRenamingFileId(null);
    setRenameValue("");
  };

  // 파일 이름 변경 취소
  const handleRenameCancel = () => {
    setRenamingFileId(null);
    setRenameValue("");
  };

  // 파일 복사
  const handleCopy = (fileId: string) => {
    if (onCopyFile) {
      onCopyFile(fileId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
  };

  // 키보드 단축키 핸들러
  const handleKeyDown = (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === "Delete") {
      e.preventDefault();
      onRemoveFile(fileId);
    }
    if (e.key === "F2") {
      e.preventDefault();
      handleRename(fileId);
    }
  };

  // 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
    };
    if (contextMenu.visible) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu.visible]);

  return {
    fileInputRef,
    contextMenu,
    focusedFileId,
    setFocusedFileId,
    renamingFileId,
    renameValue,
    setRenameValue,
    handleFileChange,
    handleContextMenu,
    handleDelete,
    handleRename,
    handleRenameSubmit,
    handleRenameCancel,
    handleCopy,
    handleKeyDown,
  };
}
