/**
 * 노트 생성 모달 훅
 * 파일 업로드, 유효성 검사, 드래그 앤 드롭, 저장소 로직
 */
"use client";

import { useEffect, useState } from "react";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("CreateNoteModal");
import { useNoteSettingsStore } from "@/stores";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useFolders } from "@/features/dashboard";
import {
  validateFiles,
  generateSafeFileName,
  calculateStorageUsage,
} from "@/lib/utils";
import type { NoteData } from "@/lib/types";

export function useCreateNoteModal(
  onSubmit: (noteData: NoteData) => Promise<void> | void,
  defaultFolderId?: string | null,
  initialNoteType: "student" | "educator" = "student"
) {
  const {
    title,
    selectedLocation,
    uploadedFiles,
    isDragActive,
    validationErrors,
    noteType,
    setTitle,
    setSelectedLocation,
    setValidationErrors,
    setIsDragActive,
    addUploadedFiles,
    removeUploadedFile,
    updateUploadedFile,
    setNoteType,
    reset,
  } = useNoteSettingsStore();

  const { folders: dbFolders } = useFolders();
  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 모달 열릴 때 또는 defaultFolderId 변경 시 기본 폴더 설정
  useEffect(() => {
    if (defaultFolderId !== undefined && defaultFolderId !== null) {
      setSelectedLocation(defaultFolderId);
    } else {
      // defaultFolderId가 없으면 Root 폴더 ID를 기본값으로 설정
      const rootFolder = dbFolders.find(f => f.name === "Root" && f.parentId === null);
      if (rootFolder) {
        setSelectedLocation(rootFolder.id);
      }
    }
  }, [defaultFolderId, dbFolders, setSelectedLocation]);

  // 모달 열릴 때 초기 노트 타입 설정
  useEffect(() => {
    setNoteType(initialNoteType);
  }, [initialNoteType, setNoteType]);

  // 파일 업로드 관리
  const uploadQueue = useFileUpload({
    maxConcurrent: 2,
    onFileComplete: (file) => {
      // 파일 업로드 완료
    },
    onFileError: (file, error) => {
      // 파일 업로드 실패
    },
    onAllComplete: (results) => {
      // 모든 파일 업로드 완료
    },
  });

  // 업로드 상태 동기화
  useEffect(() => {
    uploadQueue.files.forEach((queueFile) => {
      updateUploadedFile(queueFile.file, {
        progress: 0,
        status: queueFile.status,
        error: queueFile.error,
      });
    });
  }, [uploadQueue.files, updateUploadedFile]);

  // 선택된 폴더명 조회
  const getSelectedFolderName = () => {
    if (selectedLocation === "root") return "Root";
    const folder = dbFolders.find((f) => f.id === selectedLocation);
    // "Root" 시스템 폴더인 경우 "Root"로 표시
    if (folder && folder.name === "Root" && folder.parentId === null) {
      return "Root";
    }
    return folder?.name || "Root";
  };

  // 파일 추가 핸들러
  const handleFilesAdded = async (files: File[]) => {
    setValidationErrors([]);

    // 파일 유효성 검사
    const existingFiles = uploadedFiles.map((uf) => uf.file);
    const { validFiles, invalidFiles, duplicates } = validateFiles(
      files,
      existingFiles
    );

    // 유효성 검사 실패 파일 오류 표시
    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map((f) => `${f.file.name}: ${f.error}`);
      setValidationErrors(errors);
    }

    // 파일명 충돌 처리
    if (duplicates.length > 0) {
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

        // TODO: 알림 시스템 추가
        log.warn(
          `파일 이름 충돌: "${originalFile.name}"이(가) 이미 존재하여 "${suggestedName}"(으)로 저장되었습니다.`
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
  const handleSubmit = async () => {
    if (isCreating) return;

    // 제목이 비어있으면 첫 번째 파일의 이름을 사용 (확장자 제외)
    let finalTitle = title.trim();
    if (!finalTitle && uploadedFiles.length > 0) {
      const firstFileName = uploadedFiles[0].file.name;
      // 확장자 제거
      finalTitle = firstFileName.replace(/\.[^/.]+$/, "");
      log.debug("첫 번째 파일명을 제목으로 사용:", finalTitle);
    }
    if (!finalTitle) {
      finalTitle = "제목 없음";
    }

    const noteData: NoteData = {
      title: finalTitle,
      location: selectedLocation,
      files: uploadedFiles.map((uf) => uf.file),
      type: noteType,
    };

    try {
      setIsCreating(true);
      await onSubmit(noteData);
      reset();
    } catch (error) {
      log.error("노트 생성 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "노트 생성에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // 저장 공간 사용량 계산
  const storageUsage =
    uploadedFiles.length > 0
      ? calculateStorageUsage(uploadedFiles.map((uf) => uf.file))
      : null;

  return {
    // 상태
    title,
    selectedLocation,
    uploadedFiles,
    isDragActive,
    validationErrors,
    noteType,
    isFolderSelectorOpen,
    isCreating,
    storageUsage,
    uploadQueue,

    // 설정 함수
    setTitle,
    setSelectedLocation,
    setValidationErrors,
    setIsDragActive,
    setNoteType,
    setIsFolderSelectorOpen,

    // 핸들러
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    handleSubmit,
    removeUploadedFile,
    getSelectedFolderName,
    reset,
  };
}
