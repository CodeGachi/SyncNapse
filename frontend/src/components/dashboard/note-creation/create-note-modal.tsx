/**
 * Note creation modal UI component
 * Figma design based (참고.css)
 */

"use client";

import { useRef } from "react";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { useFolders, useCreateNoteModal } from "@/features/dashboard";
import type { NoteData } from "@/lib/types";
import { Modal } from "@/components/common/modal";
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

  // Modal close handler
  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName="fixed inset-0 z-40 transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      contentClassName="flex flex-col items-center p-12 gap-2.5 bg-[#2F2F2F] rounded-[30px] w-[871px] max-h-[90vh]"
      closeButton={false}
    >
      {/* Content Container */}
      <div className="flex flex-col justify-center items-start gap-3 w-[775px]">
        {/* Header Row */}
        <div className="flex flex-row justify-center items-center gap-2.5 w-full h-11">
          <h2 className="flex-1 font-['Inter'] font-bold text-4xl leading-[44px] text-white">
            {noteType === "student" ? "새 개인 노트" : "새 강의 노트"}
          </h2>
          <button
            onClick={handleClose}
            className="w-[33px] h-[33px] flex items-center justify-center hover:opacity-70 transition-opacity"
          >
            <svg width="33" height="33" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.25 8.25L24.75 24.75M24.75 8.25L8.25 24.75" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Subtitle */}
        <p className="w-full font-['Inter'] font-semibold text-xl leading-6 text-white">
          노트 이름을 입력하고 파일을 업로드 하세요
        </p>

        {/* Validation error display */}
        {validationErrors.length > 0 && (
          <div className="w-full bg-red-900/20 border border-red-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <ul className="text-sm text-red-300 space-y-1">
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

        {/* Input Row: Title + Folder Selector */}
        <div className="flex flex-row items-center gap-6 w-full h-11">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목을 입력하세요"
            className="flex-1 h-11 bg-[#5E5E67] rounded-[15px] px-4 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#899649]"
          />

          {/* Folder Selector Button */}
          <button
            type="button"
            onClick={() => setIsFolderSelectorOpen(true)}
            className="flex flex-row items-center px-2.5 py-2.5 gap-2.5 min-w-[150px] h-11 bg-[#5E5E67] rounded-[15px] hover:bg-[#6E6E77] transition-colors"
          >
            <div className="flex items-center gap-2">
              {/* Folder Icon */}
              <div className="w-6 h-6 flex items-center justify-center">
                <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="16" height="10" rx="2" fill="white"/>
                  <rect x="2" y="2" width="8" height="4" rx="2" fill="white"/>
                </svg>
              </div>
              <span className="font-['Pretendard_GOV_Variable'] font-bold text-base text-[#D9D9D9]">
                {getSelectedFolderName()}
              </span>
            </div>
          </button>
        </div>

        {/* File List Area */}
        <div
          className={`flex flex-col justify-start items-center p-[25px] gap-4 w-full h-[455px] bg-[#5E5E67] rounded-[25px] ${
            isDragActive ? "ring-2 ring-[#899649]" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File List Container */}
          <div className="flex flex-col items-start gap-1 w-[725px] flex-1 overflow-y-auto">
            {/* Empty state */}
            {uploadedFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full h-full text-[#D9D9D9]">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4 opacity-50">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 15L12 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-sm opacity-70">파일을 드래그하거나 아래 버튼을 클릭하세요</p>
              </div>
            )}

            {/* Uploaded files - marked with underline */}
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex flex-row items-center gap-2 h-6 group"
              >
                {/* File Icon */}
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V17C1 17.5304 1.21071 18.0391 1.58579 18.4142C1.96086 18.7893 2.46957 19 3 19H14C14.5304 19 15.0391 18.7893 15.4142 18.4142C15.7893 18.0391 16 17.5304 16 17V7L10 1Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 1V7H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="font-['Pretendard_GOV_Variable'] font-bold text-base text-[#D9D9D9] underline decoration-[#D9D9D9]">
                  {file.name}
                </span>
                {/* Remove button */}
                <button
                  onClick={() => removeUploadedFile(file.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-red-400 hover:text-red-300"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add File Button - always at bottom */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-row justify-center items-center p-3 gap-2 w-[725px] h-12 bg-white rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            {/* Plus Icon */}
            <div className="w-6 h-6 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="0" width="4" height="16" rx="2" fill="#899649"/>
                <rect x="0" y="6" width="16" height="4" rx="2" fill="#899649"/>
              </svg>
            </div>
            <span className="font-['Inter'] font-bold text-sm text-[#899649]">
              새 파일 추가
            </span>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-row justify-end items-center gap-6 w-full h-[41px]">
          <button
            onClick={handleSubmit}
            disabled={isCreating}
            className="flex flex-col justify-center items-center px-8 gap-2.5 h-[41px] bg-[#899649] rounded-[15px] hover:bg-[#7A8740] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-['Inter'] font-bold text-base text-white">
              {isCreating ? "생성 중..." : "노트 생성"}
            </span>
          </button>
          <button
            onClick={handleClose}
            className="flex flex-col justify-center items-center px-8 gap-2.5 h-[41px] bg-[#5E5E67] rounded-[15px] hover:bg-[#6E6E77] transition-colors"
          >
            <span className="font-['Inter'] font-bold text-base text-white">
              취소
            </span>
          </button>
        </div>
      </div>

      {/* Folder selector modal */}
      <FolderSelectorModal
        isOpen={isFolderSelectorOpen}
        onClose={() => setIsFolderSelectorOpen(false)}
        onSelect={(folderId) => setSelectedLocation(folderId)}
        folderTree={buildFolderTree()}
        selectedFolderId={selectedLocation}
      />
    </Modal>
  );
}
