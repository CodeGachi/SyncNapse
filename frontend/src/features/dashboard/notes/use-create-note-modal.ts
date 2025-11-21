/**
 * CreateNoteModal Hook
 * File upload, validation, drag-and-drop, and storage logic
 */
"use client";

import { useEffect, useState } from "react";
import { FILE_CONSTRAINTS } from "@/lib/constants";
import { useNoteSettingsStore } from "@/stores";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useFolders } from "@/features/dashboard";
import {
  validateFiles,
  generateSafeFileName,
  calculateStorageUsage,
  isZipFile,
  processZipFile,
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
    autoExtractZip,
    noteType,
    setTitle,
    setSelectedLocation,
    setValidationErrors,
    setAutoExtractZip,
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

  // Set default folder when modal opens or defaultFolderId changes
  useEffect(() => {
    if (defaultFolderId !== undefined) {
      setSelectedLocation(defaultFolderId || "root");
    }
  }, [defaultFolderId, setSelectedLocation]);

  // Set initial note type when modal opens
  useEffect(() => {
    setNoteType(initialNoteType);
  }, [initialNoteType, setNoteType]);

  // File upload Management
  const uploadQueue = useFileUpload({
    maxConcurrent: 2,
    onFileComplete: (file) => {
      // File upload Complete
    },
    onFileError: (file, error) => {
      // File upload Failure
    },
    onAllComplete: (results) => {
      // all File upload Complete
    },
  });

  // Upload Status
  useEffect(() => {
    uploadQueue.files.forEach((queueFile) => {
      updateUploadedFile(queueFile.file, {
        progress: 0,
        status: queueFile.status,
        error: queueFile.error,
      });
    });
  }, [uploadQueue.files, updateUploadedFile]);

  // Select Folder name Import
  const getSelectedFolderName = () => {
    if (selectedLocation === "root") return "루트";
    const folder = dbFolders.find((f) => f.id === selectedLocation);
    // If the folder is the "Root" system folder, display it as "루트" instead
    if (folder && folder.name === "Root" && folder.parentId === null) {
      return "루트";
    }
    return folder?.name || "루트";
  };

  // File Add Handler
  const handleFilesAdded = async (files: File[]) => {
    setValidationErrors([]);

    // ZIP File Process
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

    // File Validation
    const existingFiles = uploadedFiles.map((uf) => uf.file);
    const { validFiles, invalidFiles, duplicates } = validateFiles(
      processedFiles,
      existingFiles
    );

    // Validation Failure File Error Display
    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map((f) => `${f.file.name}: ${f.error}`);
      setValidationErrors(errors);
    }

    // File Conflict Process
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

        // TODO: Add notification system
        console.warn(
          `파일 이름 충돌: "${originalFile.name}"이(가) 이미 존재하여 "${suggestedName}"(으)로 저장되었습니다.`
        );
      });

      validFiles.push(...renamedFiles);
    }

    // Valid File Add
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

  // drag 앤 드롭 Handler
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

  // Submit Handler
  const handleSubmit = async () => {
    if (isCreating) return;

    // 제목이 비어있으면 첫 번째 파일의 이름을 사용 (확장자 제외)
    let finalTitle = title.trim();
    if (!finalTitle && uploadedFiles.length > 0) {
      const firstFileName = uploadedFiles[0].file.name;
      // 확장자 제거
      finalTitle = firstFileName.replace(/\.[^/.]+$/, "");
      console.log('[useCreateNoteModal] Using first file name as title:', finalTitle);
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
      console.error("Failed to create note:", error);
      const errorMessage = error instanceof Error ? error.message : "노트 생성에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  // Save Space Usage Calculation
  const storageUsage =
    uploadedFiles.length > 0
      ? calculateStorageUsage(uploadedFiles.map((uf) => uf.file))
      : null;

  return {
    // State
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

    // Setters
    setTitle,
    setSelectedLocation,
    setValidationErrors,
    setAutoExtractZip,
    setIsDragActive,
    setNoteType,
    setIsFolderSelectorOpen,

    // Handlers
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
