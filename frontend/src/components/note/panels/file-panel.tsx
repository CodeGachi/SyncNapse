/**
 * 파일 패널 컴포넌트 (Dynamic Island 스타일 애니메이션)
 */

"use client";

import type { FileItem } from "@/lib/types";
import { useFilePanelUI } from "@/features/note";
import { Panel } from "./panel";
import { FileText, FileUp, Plus, Trash2, Pencil, Copy } from "lucide-react";

interface FilePanelProps {
  isOpen: boolean;
  files: FileItem[];
  onAddFile: (file: File) => void;
  onRemoveFile: (id: string) => void | Promise<void>; // async 지원
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onOpenFileInTab: (id: string) => void;
  onRenameFile?: (id: string, newName: string) => void;
  onCopyFile?: (id: string) => void;
  onClose?: () => void;
}

export function FilePanel({
  isOpen,
  files,
  onAddFile,
  onRemoveFile,
  selectedFileId,
  onSelectFile,
  onOpenFileInTab,
  onRenameFile,
  onCopyFile,
  onClose
}: FilePanelProps) {
  const {
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
    handleCopy,
    handleKeyDown,
  } = useFilePanelUI({
    files,
    onAddFile,
    onRemoveFile,
    onRenameFile,
    onCopyFile,
  });

  return (
    <Panel isOpen={isOpen} borderColor="gray" title="파일" onClose={onClose}>
      {/* 파일 목록 */}
      <div className="px-3 py-2 flex-1 overflow-y-auto custom-scrollbar">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60">
            <div className="w-10 h-10 bg-background-overlay rounded-full flex items-center justify-center mb-1">
              <FileUp size={20} className="text-foreground-tertiary" />
            </div>
            <div>
              <p className="text-foreground-tertiary text-xs font-medium">파일이 없습니다</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {files.map((file) => (
              <div
                key={file.id}
                tabIndex={0}
                onClick={() => onOpenFileInTab(file.id)}
                onContextMenu={(e) => handleContextMenu(e, file.id)}
                onKeyDown={(e) => handleKeyDown(e, file.id)}
                onFocus={() => setFocusedFileId(file.id)}
                onBlur={() => setFocusedFileId(null)}
                className={`flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer outline-none group relative ${selectedFileId === file.id
                    ? "bg-brand/20"
                    : "bg-transparent hover:bg-foreground/10"
                  }`}
              >
                {/* Selection Indicator */}
                {selectedFileId === file.id && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-brand rounded-r-full" />
                )}

                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden pl-1">
                  {/* 파일 아이콘 */}
                  <FileText
                    size={16}
                    className={`flex-shrink-0 transition-colors ${selectedFileId === file.id ? "text-brand" : "text-foreground-tertiary group-hover:text-foreground-secondary"
                      }`}
                  />

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
                        className="bg-transparent border-b border-brand text-foreground text-xs py-0.5 w-full outline-none"
                      />
                    ) : (
                      <p className={`text-xs truncate transition-colors ${selectedFileId === file.id ? "text-brand font-medium" : "text-foreground-secondary group-hover:text-foreground"
                        }`}>
                        {file.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onRemoveFile(file.id);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-foreground-tertiary hover:text-red-400 transition-all"
                  title="파일 삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && contextMenu.fileId && (
        <div
          className="fixed bg-background-elevated border border-border rounded-lg shadow-xl py-1 z-50 min-w-[140px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          {/* 이름 변경 */}
          <button
            onClick={() => handleRename(contextMenu.fileId!)}
            className="w-full px-3 py-2 text-left text-xs text-foreground-secondary hover:bg-background-overlay hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Pencil size={12} />
            이름 변경
          </button>

          {/* 복사 */}
          <button
            onClick={() => handleCopy(contextMenu.fileId!)}
            className="w-full px-3 py-2 text-left text-xs text-foreground-secondary hover:bg-background-overlay hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Copy size={12} />
            복사
          </button>

          {/* 구분선 */}
          <div className="my-1 border-t border-border"></div>

          {/* 삭제 */}
          <button
            onClick={() => handleDelete(contextMenu.fileId!)}
            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <Trash2 size={12} />
            삭제
          </button>
        </div>
      )}

      {/* 파일 추가 버튼 - sticky footer */}
      <div className="p-3 border-t border-border flex-shrink-0 sticky bottom-0 bg-background-elevated">
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
          className="flex items-center justify-center gap-2 w-full py-2 bg-background-overlay border border-border text-foreground-secondary rounded-lg cursor-pointer transition-all hover:bg-background-base hover:text-foreground hover:border-border-hover active:scale-[0.98]"
        >
          <Plus size={16} />
          <span className="text-xs font-medium">파일 추가</span>
        </label>
      </div>
    </Panel>
  );
}
