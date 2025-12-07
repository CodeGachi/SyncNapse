/**
 * 노트 데이터를 Liveblocks Storage에 동기화하는 Custom Hook
 *
 * Educator가 협업을 시작할 때 로컬 노트 데이터를 Liveblocks Storage에 저장하여
 * 공유 링크로 접속한 학생들도 노트를 볼 수 있도록 합니다.
 *
 * ⭐ 드로잉 동기화: IndexedDB의 모든 드로잉 데이터를 Liveblocks canvasData로 전송
 */

"use client";

import { useEffect, useRef } from "react";
import { useMutation, useStorage, getCanvasKey } from "@/lib/liveblocks/liveblocks.config";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("Liveblocks");
import type { Note, FileItem } from "@/lib/types";
import { useNoteEditorStore } from "@/stores";
import { getDrawingsByNote } from "@/lib/db/drawings";

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

      // 새 파일 추가 (FileItem.backendUrl 또는 url 사용)
      fileList.forEach((file) => {
        // FileItem에서 backendUrl 또는 url 가져오기
        const fileUrl = file.backendUrl || file.url || "";

        // 파일 메타데이터 저장 (URL이 없어도 메타데이터는 저장)
        const fileData = {
          id: file.id,
          noteId: noteIdValue,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: fileUrl,
          totalPages: undefined,
          uploadedAt: new Date(file.uploadedAt).getTime(),
        };
        currentFiles.push(fileData);

        log.debug(`⭐ 파일 저장:`, {
          id: file.id,
          name: file.name,
          hasBackendUrl: !!file.backendUrl,
          hasUrl: !!file.url,
          fileUrl: fileUrl.substring(0, 80),
        });
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

  // ⭐ 드로잉 데이터를 Storage에 저장 (canvasData)
  const syncDrawings = useMutation(
    ({ storage }, drawingsMap: Record<string, object>) => {
      let canvasData = storage.get("canvasData");

      // canvasData가 없으면 초기화
      if (!canvasData) {
        storage.set("canvasData", {});
        canvasData = storage.get("canvasData");
      }

      // 드로잉이 비어있으면 스킵
      const drawingKeys = Object.keys(drawingsMap);
      if (drawingKeys.length === 0) {
        log.debug("저장할 드로잉이 없습니다.");
        return;
      }

      // 각 페이지의 드로잉 데이터 동기화
      let totalObjects = 0;
      drawingKeys.forEach((canvasKey) => {
        const canvasJSON = drawingsMap[canvasKey] as any;
        if (canvasJSON && typeof canvasData === "object") {
          (canvasData as Record<string, object>)[canvasKey] = canvasJSON;
          const objectCount = canvasJSON.objects?.length || 0;
          totalObjects += objectCount;
          log.debug(`⭐ 드로잉 Liveblocks 전송: ${canvasKey}, 객체 수: ${objectCount}`);
        }
      });

      log.debug(`⭐ 드로잉 데이터 ${drawingKeys.length}개 페이지, 총 ${totalObjects}개 객체 동기화 완료`);
    },
    []
  );

  // ⭐ 드로잉 초기 동기화 완료 여부 (중복 방지)
  const hasDrawingSyncedRef = useRef(false);

  // 협업 시작 시 자동 동기화
  useEffect(() => {
    if (!isCollaborating || !isEducator || !note) {
      return;
    }

    log.debug("협업 시작 - 노트 데이터 동기화 시작...");

    // 1. 노트 정보 동기화
    syncNoteInfo(note);

    // 2. 파일 목록 동기화
    log.debug("⭐ 파일 동기화 시작:", {
      filesCount: files.length,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        hasBackendUrl: !!f.backendUrl,
        backendUrl: f.backendUrl?.substring(0, 50),
      })),
    });
    if (files.length > 0) {
      syncFiles(files, note.id);
    } else {
      log.warn("⭐ 동기화할 파일이 없습니다!");
    }

    // 3. 필기 데이터 동기화
    if (Object.keys(pageNotes).length > 0) {
      syncPageNotes(pageNotes);
    }

    // 4. ⭐ 드로잉 데이터 동기화 (IndexedDB → Liveblocks)
    // 한 번만 실행 (중복 방지)
    if (!hasDrawingSyncedRef.current) {
      hasDrawingSyncedRef.current = true;

      const syncAllDrawings = async () => {
        try {
          const drawings = await getDrawingsByNote(note.id);

          if (drawings.length === 0) {
            log.debug("동기화할 드로잉 데이터 없음");
            return;
          }

          // canvasKey 형식으로 변환: fileId-pageNum -> canvasJSON
          const drawingsMap: Record<string, object> = {};

          drawings.forEach((drawing) => {
            if (drawing.canvas && drawing.canvas.objects?.length > 0) {
              const canvasKey = getCanvasKey(drawing.fileId, drawing.pageNum);
              drawingsMap[canvasKey] = drawing.canvas;
            }
          });

          if (Object.keys(drawingsMap).length > 0) {
            syncDrawings(drawingsMap);
            log.debug(`IndexedDB → Liveblocks 드로잉 동기화 완료: ${Object.keys(drawingsMap).length}개 페이지`);
          }
        } catch (error) {
          log.error("드로잉 동기화 실패:", error);
        }
      };

      syncAllDrawings();
    }

    log.debug("노트 데이터 동기화 완료");
  }, [isCollaborating, isEducator, note, files, pageNotes, syncNoteInfo, syncFiles, syncPageNotes, syncDrawings]);

  return {
    syncNoteInfo,
    syncFiles,
    syncPageNotes,
    syncDrawings,
  };
}
