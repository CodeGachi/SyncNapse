/**
 * Note creation modal UI component
 */

"use client";

import { FILE_CONSTRAINTS } from "@/lib/constants";
import { useFolders } from "@/features/dashboard";
import { useCreateNoteModal } from "@/features/dashboard";
import type { NoteData } from "@/lib/types";
import { Modal } from "@/components/common/modal";
import { UploadArea } from "./upload-area";
import { FileList } from "./file-list";
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
  const {
    title,
    selectedLocation,
    uploadedFiles,
    isDragActive,
    validationErrors,
    autoExtractZip,
    noteType,
    isFolderSelectorOpen,
    isCreating,
    storageUsage,
    uploadQueue,
    setTitle,
    setSelectedLocation,
    setValidationErrors,
    setAutoExtractZip,
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
      contentClassName="bg-[#3C3C3C] rounded-2xl shadow-2xl p-8 flex flex-col gap-8 w-full max-w-[896px]"
      closeButton={false}
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[30px] font-bold text-white leading-9">
            {noteType === "student" ? "새 개인노트" : "새 강의노트"}
          </h2>
          <p className="text-base text-white mt-2">
            노트 정보를 입력하고 파일을 업로드하세요
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-[#9CA3AF] hover:text-white transition-colors"
        >
          <svg
            width="18"
            height="24"
            viewBox="0 0 18 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1L17 23M17 1L1 23"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Validation error display */}
      {validationErrors.length > 0 && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-xl">⚠️</div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-400 mb-2">
                파일 업로드 오류
              </h4>
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

      {/* Storage usage */}
      {storageUsage && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">저장 공간 사용량</span>
            <span className="text-sm font-semibold text-gray-200">
              {storageUsage.totalGB.toFixed(2)} GB /{" "}
              {(FILE_CONSTRAINTS.MAX_TOTAL_SIZE / (1024 * 1024 * 1024)).toFixed(0)} GB
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storageUsage.usagePercentage > 90
                  ? "bg-red-500"
                  : storageUsage.usagePercentage > 70
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(storageUsage.usagePercentage, 100)}%`,
              }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {storageUsage.usagePercentage.toFixed(1)}% 사용 중
          </div>
        </div>
      )}

      {/* Note settings form */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목"
            className="w-full bg-[#575757] text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#AFC02B] placeholder-gray-400 text-sm"
          />
        </div>
        <div className="w-48">
          <button
            type="button"
            onClick={() => setIsFolderSelectorOpen(true)}
            className="w-full bg-[#575757] text-white px-4 py-2.5 rounded-lg outline-none hover:ring-2 hover:ring-[#AFC02B] cursor-pointer text-sm flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="truncate">{getSelectedFolderName()}</span>
            </div>
            <svg
              className="w-4 h-4 flex-shrink-0 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content area - using sub-components */}
      <div className="flex gap-4 h-[300px]">
        <UploadArea
          isDragActive={isDragActive}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
        />

        <FileList
          uploadedFiles={uploadedFiles}
          uploadQueue={uploadQueue}
          onRemoveFile={removeUploadedFile}
        />
      </div>

      {/* Bottom section */}
      <div className="flex justify-between items-center pt-4 border-t border-[#575757]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-white">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="7" cy="7" r="6" stroke="#4B5563" strokeWidth="2" />
              <path
                d="M7 4V7L9 9"
                stroke="#4B5563"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>지원 형식: PDF, DOC, DOCX, JPG, PNG, MP4, MOV, ZIP</span>
          </div>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={autoExtractZip}
              onChange={(e) => setAutoExtractZip(e.target.checked)}
              className="w-4 h-4 accent-[#AFC02B]"
            />
            <span>ZIP 파일 자동 압축 해제 (실험적 기능)</span>
          </label>
        </div>

        <div className="flex gap-7">
          <button
            onClick={handleClose}
            className="px-5 py-[11px] bg-[#B9B9B9] text-[#374151] rounded-lg font-medium text-base hover:bg-[#A0A0A0] transition-colors border border-[#D1D5DB]"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isCreating}
            className="px-[18px] py-[10px] bg-[#AFC02B] text-white rounded-lg font-medium text-base hover:bg-[#9DB025] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "노트 생성"}
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
