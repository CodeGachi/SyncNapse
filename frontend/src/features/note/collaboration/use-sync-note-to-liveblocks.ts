/**
 * 노트 데이터를 Liveblocks Storage에 동기화하는 Custom Hook
 *
 * Educator가 협업을 시작할 때 로컬 노트 데이터를 Liveblocks Storage에 저장하여
 * 공유 링크로 접속한 학생들도 노트를 볼 수 있도록 합니다.
 */

"use client";

import { useEffect } from "react";
import { useMutation } from "@/lib/liveblocks/liveblocks.config";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("Liveblocks");
import type { Note, FileItem } from "@/lib/types";
import { useNoteEditorStore } from "@/stores";

interface UseSyncNoteToLiveblocksProps {
  isCollaborating: boolean;
  isEducator: boolean;
  note: Note | null;
  files: FileItem[];
}

export function useSyncNoteToLiveblocks({
  isCollaborating,
  isEducator,
  note,
  files,
}: UseSyncNoteToLiveblocksProps) {
  const { pageNotes } = useNoteEditorStore();

  // 노트 정보를 Storage에 저장
  const syncNoteInfo = useMutation(
    ({ storage }, noteData: Note) => {
      const currentInfo = storage.get("noteInfo");

      // 이미 저장되어 있으면 스킵 (중복 저장 방지)
      if (currentInfo && currentInfo.id === noteData.id) {
        log.debug("노트 정보가 이미 동기화되어 있습니다.");
        return;
      }

      storage.set("noteInfo", {
        id: noteData.id,
        title: noteData.title,
        type: noteData.type,
        folderId: noteData.folderId,
        createdAt: noteData.createdAt,
        updatedAt: noteData.updatedAt,
      });

      log.debug("노트 정보 동기화 완료:", noteData.title);
    },
    []
  );

  // 파일 목록을 Storage에 저장 (백엔드 URL만 저장, blob URL은 저장하지 않음)
  const syncFiles = useMutation(
    ({ storage }, fileList: FileItem[], noteIdValue: string) => {
      const currentFiles = storage.get("files");

      // 파일이 비어있으면 스킵
      if (fileList.length === 0) {
        log.debug("저장할 파일이 없습니다.");
        return;
      }

      // 이미 동기화되어 있으면 스킵
      if (currentFiles.length === fileList.length) {
        log.debug("파일 목록이 이미 동기화되어 있습니다.");
        return;
      }

      // 기존 파일 초기화
      while (currentFiles.length > 0) {
        currentFiles.pop();
      }

      // 새 파일 추가 (FileItem.backendUrl 직접 사용)
      fileList.forEach((file) => {
        // FileItem에서 직접 backendUrl 가져오기
        const backendUrl = file.backendUrl;

        // Backend URL이 있는 경우에만 Storage에 저장
        // (없으면 Student가 백엔드로부터 받아와야 함)
        if (backendUrl) {
          const fileData = {
            id: file.id,
            noteId: noteIdValue,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileUrl: backendUrl,
            totalPages: undefined,
            uploadedAt: new Date(file.uploadedAt).getTime(),
          };
          currentFiles.push(fileData);

          log.debug(`파일 저장 (Backend URL):`, {
            name: file.name,
            url: backendUrl.substring(0, 50) + '...',
            hasBackendUrl: true,
          });
        } else {
          log.warn(
            `백엔드 URL 없음 (Blob URL은 Storage에 저장하지 않음): ${file.name}`
          );
        }
      });

      log.debug(`파일 ${currentFiles.length}개 동기화 완료`);
    },
    []
  );

  // 필기 데이터를 Storage에 저장
  const syncPageNotes = useMutation(
    ({ storage }, notes: Record<string, any[]>) => {
      const currentPageNotes = storage.get("pageNotes");

      // 필기가 비어있으면 스킵
      const noteKeys = Object.keys(notes);
      if (noteKeys.length === 0) {
        log.debug("저장할 필기가 없습니다.");
        return;
      }

      // 각 페이지의 필기 데이터 동기화
      noteKeys.forEach((key) => {
        const pageBlocks = notes[key];

        if (!pageBlocks || pageBlocks.length === 0) {
          return;
        }

        // 기존 필기 삭제
        if (currentPageNotes[key]) {
          delete currentPageNotes[key];
        }

        // 새 필기 추가
        currentPageNotes[key] = pageBlocks.map((block) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          checked: block.checked,
          order: block.order,
          createdAt: block.createdAt,
        }));
      });

      log.debug(`필기 데이터 ${noteKeys.length}개 페이지 동기화 완료`);
    },
    []
  );

  // 협업 시작 시 자동 동기화
  useEffect(() => {
    if (!isCollaborating || !isEducator || !note) {
      return;
    }

    log.debug("협업 시작 - 노트 데이터 동기화 시작...");

    // 1. 노트 정보 동기화
    syncNoteInfo(note);

    // 2. 파일 목록 동기화
    if (files.length > 0) {
      syncFiles(files, note.id);
    }

    // 3. 필기 데이터 동기화
    if (Object.keys(pageNotes).length > 0) {
      syncPageNotes(pageNotes);
    }

    log.debug("노트 데이터 동기화 완료");
  }, [isCollaborating, isEducator, note, files, pageNotes, syncNoteInfo, syncFiles, syncPageNotes]);

  return {
    syncNoteInfo,
    syncFiles,
    syncPageNotes,
  };
}
