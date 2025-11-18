/**
 * 파일 패널 상태 관리 훅
 */

import { useState } from "react";

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  url: string; // 파일 데이터 URL
  file?: File; // 원본 파일 객체
}

export function useFilePanel() {
  const [isFilePanelOpen, setIsFilePanelOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const toggleFilePanel = () => {
    setIsFilePanelOpen((prev) => !prev);
  };

  const addFile = async (file: File) => {
    // 파일을 Data URL로 변환
    const url = URL.createObjectURL(file);

    const newFile: FileItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url,
      file,
    };

    setFiles((prev) => [...prev, newFile]);

    // 첫 번째 파일이면 자동으로 선택
    if (files.length === 0) {
      setSelectedFileId(newFile.id);
    }

    return newFile;
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find((f) => f.id === id);

    // URL 해제를 지연시켜 React DOM 업데이트 완료 후 실행
    // 이렇게 하면 removeChild 에러를 방지할 수 있음
    // PDF 뷰어의 경우 언마운트가 복잡하므로 더 긴 지연 시간 사용
    if (fileToRemove?.url) {
      setTimeout(() => {
        URL.revokeObjectURL(fileToRemove.url);
      }, 500);
    }

    setFiles((prev) => prev.filter((file) => file.id !== id));

    // 선택된 파일이 삭제되면 다음 파일 선택
    if (selectedFileId === id) {
      const remainingFiles = files.filter((file) => file.id !== id);
      setSelectedFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null);
    }
  };

  const selectFile = (id: string) => {
    setSelectedFileId(id);
  };

  const getSelectedFile = () => {
    return files.find((file) => file.id === selectedFileId) || null;
  };

  const loadFiles = (fileItems: FileItem[]) => {
    setFiles(fileItems);
    if (fileItems.length > 0 && !selectedFileId) {
      setSelectedFileId(fileItems[0].id);
    }
  };

  const renameFile = (id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.id === id ? { ...file, name: newName } : file
      )
    );
  };

  const copyFile = (id: string) => {
    const fileToCopy = files.find((f) => f.id === id);
    if (!fileToCopy) return;

    const newFile: FileItem = {
      ...fileToCopy,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: `${fileToCopy.name.replace(/(\.[^.]+)$/, '')} - 복사본$1`,
      uploadedAt: new Date().toISOString(),
    };

    setFiles((prev) => [...prev, newFile]);
  };

  return {
    isFilePanelOpen,
    toggleFilePanel,
    files,
    addFile,
    removeFile,
    selectedFileId,
    selectFile,
    getSelectedFile,
    loadFiles,
    renameFile,
    copyFile,
  };
}