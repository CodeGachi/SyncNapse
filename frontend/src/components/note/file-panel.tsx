/**
 * 파일 패널 컴포넌트 (Dynamic Island 스타일 애니메이션)
 */

"use client";

import { useRef, useState, useEffect } from "react";
import type { FileItem } from "@/features/note";

interface FilePanelProps {
  isOpen: boolean;
  files: FileItem[];
  onAddFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onCopyFile?: (id: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  fileId: string | null;
}

export function FilePanel({ isOpen, files, onAddFile, onRemoveFile, selectedFileId, onSelectFile, onRenameFile, onCopyFile }: FilePanelProps) {
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      fileId,
    });
  };

  const handleDelete = (fileId: string) => {
    onRemoveFile(fileId);
    setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
  };

  const handleRename = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      setRenamingFileId(fileId);
      setRenameValue(file.name);
      setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
    }
  };

  const handleRenameSubmit = (fileId: string) => {
    if (renameValue.trim() && onRenameFile) {
      onRenameFile(fileId, renameValue.trim());
    }
    setRenamingFileId(null);
    setRenameValue("");
  };

  const handleCopy = (fileId: string) => {
    if (onCopyFile) {
      onCopyFile(fileId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, fileId: null });
  };

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

  if (!isOpen) return null;

  return (
    <div
      className="bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl overflow-hidden transition-all duration-500 ease-out"
      style={{
        animation: isOpen ? "expandPanel 0.5s ease-out forwards" : "none",
      }}
    >
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-[#444444]">
        <h3 className="text-white text-lg font-bold">files</h3>
      </div>

      {/* 파일 목록 */}
      <div className="px-6 py-4 max-h-[240px] overflow-y-auto">
        {files.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#666666] text-sm">업로드된 파일이 없습니다</p>
            <p className="text-[#555555] text-xs mt-1">아래 버튼으로 파일을 추가하세요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                tabIndex={0}
                onClick={() => onSelectFile(file.id)}
                onContextMenu={(e) => handleContextMenu(e, file.id)}
                onKeyDown={(e) => handleKeyDown(e, file.id)}
                onFocus={() => setFocusedFileId(file.id)}
                onBlur={() => setFocusedFileId(null)}
                className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer outline-none ${
                  selectedFileId === file.id
                    ? "bg-[#4f4f4f] ring-2 ring-[#007aff]"
                    : "bg-[#363636] hover:bg-[#3f3f3f]"
                } group`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* 파일 아이콘 */}
                  <div className="w-8 h-8 bg-[#444444] rounded flex items-center justify-center flex-shrink-0">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                    >
                      <path d="M9 1H3v14h10V5L9 1z" />
                      <path d="M9 1v4h4" />
                    </svg>
                  </div>

                  {/* 파일 정보 */}
                  <div className="flex-1 min-w-0">
                    {renamingFileId === file.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameSubmit(file.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameSubmit(file.id);
                          }
                          if (e.key === "Escape") {
                            setRenamingFileId(null);
                            setRenameValue("");
                          }
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="bg-[#444444] text-white text-sm font-medium px-2 py-1 rounded w-full outline-none focus:ring-2 focus:ring-[#007aff]"
                      />
                    ) : (
                      <p className="text-white text-sm font-medium truncate">{file.name}</p>
                    )}
                    <p className="text-[#b9b9b9] text-xs">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-[#ff4444] transition-all"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && contextMenu.fileId && (
        <div
          className="fixed bg-[#2f2f2f] border border-[#666666] rounded-lg shadow-2xl py-2 z-50 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {/* 이름 변경 */}
          <button
            onClick={() => handleRename(contextMenu.fileId!)}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3f3f3f] transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 1l3 3-8 8H2v-3l8-8z" />
            </svg>
            이름 변경 (F2)
          </button>

          {/* 복사 */}
          <button
            onClick={() => handleCopy(contextMenu.fileId!)}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#3f3f3f] transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="4" width="8" height="8" />
              <path d="M2 10V2h8" />
            </svg>
            복사
          </button>

          {/* 구분선 */}
          <div className="my-1 border-t border-[#444444]"></div>

          {/* 삭제 */}
          <button
            onClick={() => handleDelete(contextMenu.fileId!)}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#ff4444] transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 3h12M5 3V1h4v2M3 3v9a1 1 0 001 1h6a1 1 0 001-1V3" />
            </svg>
            삭제 (Delete)
          </button>
        </div>
      )}

      {/* 파일 추가 버튼 */}
      <div className="px-6 py-4 border-t border-[#444444]">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.png"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#444444] hover:bg-[#4f4f4f] rounded-lg cursor-pointer transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <path d="M8 2v12M2 8h12" />
          </svg>
          <span className="text-white text-sm font-medium">파일 추가</span>
        </label>
      </div>

      <style jsx>{`
        @keyframes expandPanel {
          0% {
            max-height: 0;
            opacity: 0;
            transform: scaleY(0.8);
            transform-origin: top;
          }
          100% {
            max-height: 500px;
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
