/**
 * File Panel UI Handlers Hook
 * Handles UI interactions: context menu, rename, delete, copy, keyboard shortcuts
 */
import { useState, useRef, useEffect } from "react";
import type { FileItem } from "@/lib/types";

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  fileId: string | null;
}

interface UseFilePanelUIProps {
  files: FileItem[];
  onAddFile: (file: File) => void;
  onRemoveFile: (id: string) => void | Promise<void>; // async 지원
  onRenameFile?: (id: string, newName: string) => void;
  onCopyFile?: (id: string) => void;
}

export function useFilePanelUI({
  files,
  onAddFile,
  onRemoveFile,
  onRenameFile,
  onCopyFile,
}: UseFilePanelUIProps) {
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

  // File Add Handler
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

  // Context Menu Open
  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      fileId,
    });
  };

  // File Delete
  const handleDelete = async (fileId: string) => {
    await onRemoveFile(fileId);
    setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
  };

  // File Name Change Start
  const handleRename = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      setRenamingFileId(fileId);
      setRenameValue(file.name);
      setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
    }
  };

  // File Name Change Complete
  const handleRenameSubmit = (fileId: string) => {
    if (renameValue.trim() && onRenameFile) {
      onRenameFile(fileId, renameValue.trim());
    }
    setRenamingFileId(null);
    setRenameValue("");
  };

  // File Name Change Cancel
  const handleRenameCancel = () => {
    setRenamingFileId(null);
    setRenameValue("");
  };

  // File Copy
  const handleCopy = (fileId: string) => {
    if (onCopyFile) {
      onCopyFile(fileId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
  };

  // Keyboard key handler
  const handleKeyDown = async (e: React.KeyboardEvent, fileId: string) => {
    if (e.key === "Delete") {
      e.preventDefault();
      await onRemoveFile(fileId);
    }
    if (e.key === "F2") {
      e.preventDefault();
      handleRename(fileId);
    }
  };

  // Context Menu Close
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
    setRenamingFileId,
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
