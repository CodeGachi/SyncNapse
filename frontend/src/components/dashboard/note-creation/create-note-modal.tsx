/**
 * 노트 생성 모달 컴포넌트
 * 제목, 폴더 위치, 파일 업로드 설정
 */

"use client";

import { useRef } from "react";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { useFolders, useCreateNoteModal } from "@/features/dashboard";
import type { NoteData } from "@/lib/types";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { FolderSelectorModal } from "../folder-management/folder-selector-modal";

interface NoteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: NoteData) => Promise<void> | void;
  defaultFolderId?: string | null;
  noteType: "student" | "educator";
}

export function NoteSettingsModal({
  isOpen,
  onClose,
  onSubmit,
  defaultFolderId,
  noteType: initialNoteType,
}: NoteSettingsModalProps) {
  const { buildFolderTree } = useFolders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    title,
    selectedLocation,
    uploadedFiles,
    isDragActive,
    validationErrors,
    noteType,
    isFolderSelectorOpen,
    isCreating,
    setTitle,
    setSelectedLocation,
    setValidationErrors,
    setIsFolderSelectorOpen,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    handleSubmit,
    removeUploadedFile,
    getSelectedFolderName,
    reset,
  } = useCreateNoteModal(onSubmit, defaultFolderId, initialNoteType);

  // 모달 닫기 핸들러
  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={noteType === "student" ? "새 개인 노트" : "새 강의 노트"}
      contentClassName="flex flex-col p-10 gap-8 bg-[#121212]/95 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-[800px] max-h-[90vh]"
    >

      {/* 입력 영역: 제목 + 폴더 선택 */}
      <div className="flex flex-col gap-6 w-full">
        {/* 제목 입력 */}
        <div className="relative w-full">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목 없음"
            maxLength={20}
            className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-gray-600 outline-none focus:ring-0 px-0 leading-tight pr-16"
            autoFocus
          />
          <span className={`absolute right-0 bottom-2 text-sm ${title.length >= 20 ? 'text-red-400' : 'text-gray-600'}`}>
            {title.length}/20
          </span>
        </div>

        {/* 메타 정보 */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">위치</span>
            <button
              type="button"
              onClick={() => setIsFolderSelectorOpen(true)}
              className="flex items-center gap-1.5 hover:bg-white/5 px-2 py-1 rounded transition-colors text-gray-300 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                <rect x="2" y="4" width="16" height="10" rx="2" fill="currentColor" />
                <rect x="2" y="2" width="8" height="4" rx="2" fill="currentColor" />
              </svg>
              <span className="underline decoration-gray-600 underline-offset-2 hover:decoration-gray-400">
                {getSelectedFolderName()}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 유효성 검사 오류 */}
      {validationErrors.length > 0 && (
        <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <ul className="text-sm text-red-400 space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setValidationErrors([])}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 파일 업로드 영역 */}
      <div
        className={`flex flex-col justify-center items-center p-8 gap-4 w-full min-h-[300px] bg-white/[0.02] border-2 border-dashed border-white/10 rounded-2xl transition-all ${isDragActive ? "border-[#899649] bg-[#899649]/5" : "hover:border-white/20 hover:bg-white/[0.04]"
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 빈 상태 */}
        {uploadedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-gray-500 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 15L12 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-400">파일을 여기에 드래그하세요</p>
              <p className="text-sm text-gray-600 mt-1">또는 클릭하여 업로드</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
            >
              파일 선택
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2">
            {uploadedFiles.map((uploadedFile, index) => (
              <div key={`${uploadedFile.file.name}-${index}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl group hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{uploadedFile.file.name}</p>
                  <p className="text-xs text-gray-500">{(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={() => removeUploadedFile(uploadedFile.file)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex items-center justify-center gap-2 p-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm">파일 추가하기</span>
            </button>
          </div>
        )}

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 하단 버튼 */}
      <div className="flex flex-row justify-end items-center gap-4 w-full mt-4">
        <Button
          variant="secondary"
          onClick={handleClose}
        >
          취소
        </Button>
        <Button
          variant="brand"
          onClick={handleSubmit}
          disabled={isCreating}
          className="min-w-[140px] font-bold"
        >
          {isCreating ? "생성 중..." : "노트 생성"}
        </Button>
      </div>

      {/* 폴더 선택 모달 */}
      <FolderSelectorModal
        isOpen={isFolderSelectorOpen}
        onClose={() => setIsFolderSelectorOpen(false)}
        onSelect={(folderId) => setSelectedLocation(folderId)}
        folderTree={buildFolderTree()}
        selectedFolderId={selectedLocation}
      />
    </Modal >
  );
}
