/**
 * 노트 설정 기능 훅
 * 파일 업로드, 검증, 충돌 처리 등의 비즈니스 로직
 */

"use client";

import { useState, useRef, useEffect } from "react";
import {
  validateFiles,
  generateSafeFileName,
  detectFileNameConflict,
  calculateStorageUsage,
  isZipFile,
  processZipFile,
} from "@/lib/utils";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { useFileUpload } from "@/hooks/use-file-upload";
import type { FileConflict, ConflictResolution, NoteData, Folder, UploadedFile } from "@/lib/types";

export function useNoteSettings() {
  const [title, setTitle] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("root");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [conflicts, setConflicts] = useState<FileConflict[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [autoExtractZip, setAutoExtractZip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 더미 폴더 목록 (나중에 API로 대체)
  const folders: Folder[] = [
    { id: "root", name: "루트" },
    { id: "folder1", name: "📁 폴더 1" },
    { id: "folder2", name: "📁 폴더 2" },
    { id: "folder3", name: "📁 폴더 3" },
  ];

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

    // 1. 파일 검증
    const existingFiles = uploadedFiles.map((uf) => uf.file);
    const { validFiles, invalidFiles, duplicates } = validateFiles(
      processedFiles,
      existingFiles
    );

    // 2. 검증 실패 파일 에러 표시
    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map((f) => `${f.file.name}: ${f.error}`);
      setValidationErrors(errors);
    }

    // 3. 중복 파일 충돌 처리
    if (duplicates.length > 0) {
      const conflictList: FileConflict[] = duplicates.map((newFile) => {
        const existing = existingFiles.find(
          (ef) =>
            ef.name === newFile.name &&
            ef.size === newFile.size &&
            ef.lastModified === newFile.lastModified
        )!;
        return {
          newFile,
          existingFile: existing,
          suggestedName: generateSafeFileName(newFile.name, existingFiles),
        };
      });
      setConflicts(conflictList);
      setShowConflictModal(true);
    }

    // 4. 유효한 파일 추가
    if (validFiles.length > 0) {
      addFilesToQueue(validFiles);
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newUploadFiles: UploadedFile[] = files.map((file) => ({
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadedFiles((prev) => [...prev, ...newUploadFiles]);
    uploadQueue.addFiles(files);

    // 자동으로 업로드 시작
    uploadQueue.startUpload();
  };

  // 업로드 상태를 uploadedFiles에 동기화
  useEffect(() => {
    uploadQueue.files.forEach((queueFile) => {
      setUploadedFiles((prev) =>
        prev.map((uf) =>
          uf.file.name === queueFile.file.name &&
          uf.file.size === queueFile.file.size
            ? {
                ...uf,
                progress: 0,
                status: queueFile.status,
                error: queueFile.error,
              }
            : uf
        )
      );
    });
  }, [
    // 배열 길이와 각 파일의 상태를 의존성으로 추가
    uploadQueue.files.length,
    ...uploadQueue.files.map((f) => `${f.id}-${f.status}`),
  ]);

  const removeFile = (file: File) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file !== file));
  };

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

  const handleConflictResolve = (
    resolutions: Map<File, ConflictResolution>
  ) => {
    const filesToAdd: File[] = [];

    resolutions.forEach((resolution, file) => {
      if (resolution === "replace") {
        // 기존 파일 제거 후 새 파일 추가
        setUploadedFiles((prev) =>
          prev.filter((uf) => uf.file.name !== file.name)
        );
        filesToAdd.push(file);
      } else if (resolution === "rename") {
        // 새 이름으로 파일 추가
        const suggestedName = generateSafeFileName(
          file.name,
          uploadedFiles.map((uf) => uf.file)
        );
        // File 객체는 불변이므로 새로 생성
        const renamedFile = new File([file], suggestedName, { type: file.type });
        filesToAdd.push(renamedFile);
      }
      // skip인 경우 아무것도 하지 않음
    });

    if (filesToAdd.length > 0) {
      addFilesToQueue(filesToAdd);
    }

    setShowConflictModal(false);
    setConflicts([]);
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const reset = () => {
    setTitle("");
    setSelectedLocation("root");
    setUploadedFiles([]);
    setSelectedFileIndex(null);
    setValidationErrors([]);
    setConflicts([]);
    setShowConflictModal(false);
  };

  const getNoteData = (): NoteData => ({
    title: title || "제목 없음",
    location: selectedLocation,
    files: uploadedFiles.map((uf) => uf.file),
  });

  const storageUsage = uploadedFiles.length > 0
    ? calculateStorageUsage(uploadedFiles.map(uf => uf.file))
    : null;

  return {
    // State
    title,
    selectedLocation,
    uploadedFiles,
    selectedFileIndex,
    isDragActive,
    conflicts,
    showConflictModal,
    validationErrors,
    autoExtractZip,
    fileInputRef,
    folders,
    uploadQueue,
    storageUsage,

    // Setters
    setTitle,
    setSelectedLocation,
    setSelectedFileIndex,
    setValidationErrors,
    setAutoExtractZip,
    setShowConflictModal,

    // Actions
    handleFilesAdded,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleConflictResolve,
    handleSelectClick,
    reset,
    getNoteData,
  };
}
