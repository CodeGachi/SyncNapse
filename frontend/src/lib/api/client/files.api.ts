/**
 * Files API - Backend와 IndexedDB를 추상화
 */

import type { DBFile } from "@/lib/db/files";
import {
  saveFile as saveFileInDB,
  getFilesByNote as getFilesByNoteFromDB,
  getFile as getFileFromDB,
  deleteFile as deleteFileInDB,
  dbFileToFile,
} from "@/lib/db/files";

const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL_DB !== "false";

/**
 * 노트의 모든 파일 가져오기
 */
export async function fetchFilesByNote(noteId: string): Promise<File[]> {
  if (USE_LOCAL) {
    const dbFiles = await getFilesByNoteFromDB(noteId);
    return dbFiles.map(dbFileToFile);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/notes/${noteId}/files`);
    if (!res.ok) throw new Error("Failed to fetch files");
    const filesData = await res.json();

    // 백엔드에서 받은 파일 URL을 File 객체로 변환
    const files = await Promise.all(
      filesData.map(async (fileData: any) => {
        const response = await fetch(fileData.url);
        const blob = await response.blob();
        return new File([blob], fileData.fileName, { type: fileData.fileType });
      })
    );

    return files;
  }
}

/**
 * 파일 저장
 */
export async function saveFile(noteId: string, file: File): Promise<DBFile> {
  if (USE_LOCAL) {
    return await saveFileInDB(noteId, file);
  } else {
    // 백엔드 API 호출
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/notes/${noteId}/files`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to save file");
    return await res.json();
  }
}

/**
 * 파일 삭제
 */
export async function deleteFile(fileId: string): Promise<void> {
  if (USE_LOCAL) {
    await deleteFileInDB(fileId);
  } else {
    // 백엔드 API 호출
    const res = await fetch(`/api/files/${fileId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete file");
  }
}

/**
 * 여러 파일 한번에 저장
 */
export async function saveMultipleFiles(
  noteId: string,
  files: File[]
): Promise<DBFile[]> {
  if (USE_LOCAL) {
    const { saveMultipleFiles: saveMultipleFilesInDB } = await import(
      "@/lib/db/files"
    );
    return await saveMultipleFilesInDB(noteId, files);
  } else {
    // 백엔드 API 호출
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`/api/notes/${noteId}/files/batch`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed to save files");
    return await res.json();
  }
}
