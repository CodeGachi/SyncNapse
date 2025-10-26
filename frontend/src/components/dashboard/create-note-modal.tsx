/**
 * 노트 설정 모달 UI 컴포넌트 
 */

"use client";

import { useEffect } from "react";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { useNoteSettingsStore } from "@/stores";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  validateFiles,
  generateSafeFileName,
  calculateStorageUsage,
  isZipFile,
  processZipFile,
} from "@/lib/utils";
import type { NoteData, Folder } from "@/lib/types";
import { Modal } from "@/components/common/modal";
import { UploadArea } from "./note-creation/upload-area";
import { FileList } from "./note-creation/file-list";

interface NoteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: NoteData) => void;
}

export function NoteSettingsModal({
  isOpen,
  onClose,
  onSubmit,
}: NoteSettingsModalProps) {
  const {
    title,
    selectedLocation,
    uploadedFiles,
    isDragActive,
    validationErrors,
    autoExtractZip,
    setTitle,
    setSelectedLocation,
    setValidationErrors,
    setAutoExtractZip,
    setIsDragActive,
    addUploadedFiles,
    removeUploadedFile,
    updateUploadedFile,
    reset,
  } = useNoteSettingsStore();

  // 더미 폴더 목록 (나중에 API로 대체)
  const folders: Folder[] = [
    { id: "root", name: "루트" },
    { id: "folder1", name: "📁 폴더 1" },
    { id: "folder2", name: "📁 폴더 2" },
    { id: "folder3", name: "📁 폴더 3" },
  ];

  // 파일 업로드 관리 (TanStack Query 기반)
  const uploadQueue = useFileUpload({
    maxConcurrent: 2,
    onFileComplete: (file) => {
      console.log("파일 업로드 완료:", file.file.name);
    },
    onFileError: (file, error) => {
      console.error("파일 업로드 실패:", file.file.name, error);
    },
    onAllComplete: (results) => {
      console.log("모든 파일 업로드 완료:", results);
    },
  });

  // 업로드 상태를 uploadedFiles에 동기화
  useEffect(() => {
    // uploadQueue.files의 각 파일 상태를 uploadedFiles에 반영
    uploadQueue.files.forEach((queueFile) => {
      updateUploadedFile(queueFile.file, {
        progress: 0,
        status: queueFile.status,
        error: queueFile.error,
      });
    });
  }, [uploadQueue.files, updateUploadedFile]);

  // 파일 추가 핸들러
  const handleFilesAdded = async (files: File[]) => {
    setValidationErrors([]);

    // ZIP 파일 처리
    const processedFiles: File[] = [];
    for (const file of files) {
      if (isZipFile(file)) {
        const extracted = await processZipFile(file, {
          autoExtract: autoExtractZip,
          allowedExtensions: FILE_CONSTRAINTS.ALLOWED_EXTENSIONS as unknown as string[],
          maxFileSize: FILE_CONSTRAINTS.MAX_FILE_SIZE,
        });
        processedFiles.push(...extracted);
      } else {
        processedFiles.push(file);
      }
    }

    // 파일 검증
    const existingFiles = uploadedFiles.map((uf) => uf.file);
    const { validFiles, invalidFiles, duplicates } = validateFiles(
      processedFiles,
      existingFiles
    );

    // 검증 실패 파일 에러 표시
    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map((f) => `${f.file.name}: ${f.error}`);
      setValidationErrors(errors);
    }

    // 중복 파일 충돌 처리
    if (duplicates.length > 0) {
      const { notify } = await import("@/stores");
      const renamedFiles: File[] = [];

      duplicates.forEach((originalFile) => {
        const suggestedName = generateSafeFileName(originalFile.name, [
          ...existingFiles,
          ...renamedFiles,
        ]);
        const renamedFile = new File([originalFile], suggestedName, {
          type: originalFile.type,
        });
        renamedFiles.push(renamedFile);

        notify.warning(
          "파일 이름 충돌",
          `"${originalFile.name}"이(가) 이미 존재하여 "${suggestedName}"(으)로 저장되었습니다.`,
          { duration: 5000 }
        );
      });

      validFiles.push(...renamedFiles);
    }

    // 유효한 파일 추가
    if (validFiles.length > 0) {
      addFilesToQueue(validFiles);
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newUploadFiles = files.map((file) => ({
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    addUploadedFiles(newUploadFiles);
    uploadQueue.addFiles(files);

    // 자동으로 업로드 시작
    uploadQueue.startUpload();
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesAdded(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFilesAdded(files);
  };

  // 제출 핸들러
  const handleSubmit = () => {
    const noteData: NoteData = {
      title: title || "제목 없음",
      location: selectedLocation,
      files: uploadedFiles.map((uf) => uf.file),
    };
    onSubmit(noteData);
    reset();
    onClose();
  };

  const storageUsage =
    uploadedFiles.length > 0
      ? calculateStorageUsage(uploadedFiles.map((uf) => uf.file))
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-40 transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      contentClassName="bg-[#3C3C3C] rounded-2xl shadow-2xl p-8 flex flex-col gap-8 w-full max-w-[896px]"
      closeButton={false}
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[30px] font-bold text-white leading-9">
            새 노트 만들기
          </h2>
          <p className="text-base text-white mt-2">
            노트 정보를 입력하고 파일을 업로드하세요
          </p>
        </div>
        <button
          onClick={onClose}
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

      {/* 검증 에러 표시 */}
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

      {/* 저장 공간 사용량 */}
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

      {/* 노트 설정 폼 */}
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
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-[#575757] text-white px-4 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#AFC02B] cursor-pointer text-sm"
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 컨텐츠 영역 - 서브 컴포넌트 사용 */}
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

      {/* 하단 */}
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
            onClick={onClose}
            className="px-5 py-[11px] bg-[#B9B9B9] text-[#374151] rounded-lg font-medium text-base hover:bg-[#A0A0A0] transition-colors border border-[#D1D5DB]"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-[18px] py-[10px] bg-[#AFC02B] text-white rounded-lg font-medium text-base hover:bg-[#9DB025] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            노트 생성
          </button>
        </div>
      </div>
    </Modal>
  );
}
