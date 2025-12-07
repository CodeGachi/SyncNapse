/**
 * 공유 모드에서 Liveblocks Storage로부터 노트 데이터를 로드하는 Custom Hook
 *
 * 공유 링크로 접속한 학생들이 Liveblocks Storage에 저장된 노트 데이터를 읽어옵니다.
 */

"use client";

import { useEffect, useState } from "react";
import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SharedNoteData");
import { useNoteEditorStore } from "@/stores";
import { initDB } from "@/lib/db";
import type { DBNote } from "@/lib/db";

interface UseSharedNoteDataProps {
  isSharedView: boolean;
  noteId: string;
}

export function useSharedNoteData({
  isSharedView,
  noteId,
}: UseSharedNoteDataProps) {
  const [noteCreated, setNoteCreated] = useState(false);

  // Liveblocks Storage에서 데이터 읽기
  const noteInfo = useStorage((root) => root.noteInfo);
  const files = useStorage((root) => root.files);
  const pageNotes = useStorage((root) => root.pageNotes);
  const currentPage = useStorage((root) => root.currentPage);
  const currentFileId = useStorage((root) => root.currentFileId);

  const {
    loadFiles,
    setSelectedFileId,
    setCurrentPage,
    setPageNotes,
  } = useNoteEditorStore();

  // 공유 모드: 백엔드에서 노트 fetch 시도, 실패 시 임시 빈 노트 생성
  useEffect(() => {
    if (!isSharedView || noteCreated) return;

    const ensureNoteExists = async () => {
      try {
        const db = await initDB();

        // 1. IndexedDB에 이미 노트가 있는지 확인
        const existingNote = await new Promise<DBNote | undefined>((resolve, reject) => {
          const transaction = db.transaction(["notes"], "readonly");
          const store = transaction.objectStore("notes");
          const request = store.get(noteId);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(new Error("노트 조회 실패"));
        });

        if (existingNote) {
          log.debug("IndexedDB에 노트 이미 존재:", existingNote.title);
          setNoteCreated(true);
          return;
        }

        // 2. 백엔드 API로 노트 fetch 시도
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (apiUrl) {
          try {
            log.debug(`백엔드에서 노트 fetch 시도: ${apiUrl}/notes/${noteId}`);
            const response = await fetch(`${apiUrl}/notes/${noteId}`);

            if (response.ok) {
              const backendNote = await response.json();
              log.debug("백엔드에서 노트 받음:", backendNote);

              // 백엔드 노트를 IndexedDB에 저장
              const note: DBNote = {
                id: noteId,
                title: backendNote.title,
                folderId: backendNote.folder_id || "shared",
                type: backendNote.type || "educator",
                createdAt: new Date(backendNote.created_at).getTime(),
                updatedAt: new Date(backendNote.updated_at).getTime(),
              };

              await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction(["notes"], "readwrite");
                const store = transaction.objectStore("notes");
                const request = store.put(note);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(new Error("노트 저장 실패"));
              });

              log.debug("백엔드 노트를 IndexedDB에 저장 완료");
              setNoteCreated(true);
              return;
            }
          } catch (error) {
            log.warn("백엔드 fetch 실패:", error);
          }
        }

        // 3. 백엔드 실패 시 임시 빈 노트 생성
        log.debug("임시 빈 노트 생성 중...");
        const tempNote: DBNote = {
          id: noteId,
          title: `공유 노트 (${noteId.slice(0, 8)})`,
          folderId: "shared",
          type: "educator",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          accessControl: {
            isPublic: false,
            allowedUsers: [],
            allowComments: true,
            realTimeInteraction: true,
          },
        };

        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(["notes"], "readwrite");
          const store = transaction.objectStore("notes");
          const request = store.put(tempNote);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error("임시 노트 생성 실패"));
        });

        log.debug("임시 빈 노트 생성 완료:", tempNote.title);
        log.debug("협업 기능 테스트를 위한 임시 노트입니다. 백엔드 연결 시 실제 노트로 대체됩니다.");
        setNoteCreated(true);
      } catch (error) {
        log.error("노트 생성 오류:", error);
      }
    };

    ensureNoteExists();
  }, [isSharedView, noteId, noteCreated]);

  // 공유 모드일 때 백엔드에서 파일을 가져오고 Liveblocks 파일 ID를 사용
  useEffect(() => {
    log.debug("⭐ useSharedNoteData useEffect 실행:", {
      isSharedView,
      hasNoteInfo: !!noteInfo,
      noteInfo,
      filesCount: files?.length || 0,
      files: files?.map(f => ({ id: f.id, fileName: f.fileName, fileUrl: f.fileUrl?.substring(0, 50) })),
    });

    if (!isSharedView || !noteInfo) {
      log.debug("대기 중:", { isSharedView, hasNoteInfo: !!noteInfo });
      return;
    }

    log.debug("공유 모드 - 백엔드에서 파일 로드 시작...");
    log.debug("noteInfo:", noteInfo);

    // ⭐ 백엔드에서 파일 목록 가져오기
    const fetchFilesFromBackend = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          log.warn("API URL이 설정되지 않음");
          return;
        }

        log.debug(`백엔드에서 파일 fetch: ${apiUrl}/files/note/${noteId}`);
        const response = await fetch(`${apiUrl}/files/note/${noteId}`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          log.warn(`파일 fetch 실패: ${response.status}`);
          return;
        }

        const backendFiles = await response.json();
        log.debug(`백엔드에서 파일 ${backendFiles.length}개 받음:`, backendFiles);

        if (backendFiles.length === 0) {
          log.debug("백엔드에 파일 없음");
          return;
        }

        // ⭐ 백엔드 파일을 Liveblocks 파일 ID와 매칭
        // Liveblocks에 파일 정보가 있으면 해당 ID 사용 (드로잉 동기화용)
        // 없으면 백엔드 파일 ID 사용
        const fileData = backendFiles.map((backendFile: any) => {
          // Liveblocks에서 같은 파일명을 가진 파일 찾기
          const liveblocksFile = files?.find(
            (f) => f.fileName === backendFile.file_name || f.id === backendFile.id
          );

          const fileId = liveblocksFile?.id || backendFile.id;

          log.debug(`파일 매핑: ${backendFile.file_name}`, {
            backendId: backendFile.id,
            liveblocksId: liveblocksFile?.id,
            usedId: fileId,
          });

          return {
            id: fileId, // ⭐ Liveblocks ID 우선 사용 (드로잉 canvasKey와 일치해야 함)
            name: backendFile.file_name,
            type: backendFile.file_type,
            size: backendFile.file_size,
            url: backendFile.file_url || "", // Backend storage URL
            uploadedAt: backendFile.uploaded_at || new Date().toISOString(),
          };
        });

        loadFiles(fileData);
        log.debug(`⭐ 파일 ${fileData.length}개 로드 완료 (Liveblocks ID 사용)`);
      } catch (error) {
        log.error("백엔드 파일 fetch 오류:", error);
      }
    };

    fetchFilesFromBackend();

    // 현재 파일 및 페이지 동기화
    if (currentFileId) {
      setSelectedFileId(currentFileId);
      log.debug("현재 파일 ID:", currentFileId);
    }

    if (currentPage) {
      setCurrentPage(currentPage);
      log.debug("현재 페이지:", currentPage);
    }

    // 필기 데이터 동기화
    if (pageNotes && Object.keys(pageNotes).length > 0) {
      const notesData: Record<string, any[]> = {};

      Object.entries(pageNotes).forEach(([key, blocks]) => {
        notesData[key] = blocks.map((block) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          checked: block.checked,
          order: block.order,
          createdAt: block.createdAt,
        }));
      });

      setPageNotes(notesData);
      log.debug(`필기 ${Object.keys(notesData).length}개 페이지 로드 완료`);
    }

    log.debug("노트 데이터 로드 완료:", noteInfo.title);
  }, [
    isSharedView,
    noteId,
    noteInfo,
    files,
    pageNotes,
    currentFileId,
    currentPage,
    loadFiles,
    setSelectedFileId,
    setCurrentPage,
    setPageNotes,
  ]);

  return {
    noteInfo,
    files,
    pageNotes,
    currentPage,
    currentFileId,
    // Liveblocks 연결 대기: noteInfo가 undefined면 아직 로딩 중
    // noteInfo가 null이면 연결은 됐지만 데이터가 없는 상태 (빈 노트)
    // 공유 모드에서는 임시 노트 생성 완료 여부도 확인
    isLoading: isSharedView && (!noteCreated || noteInfo === undefined),
  };
}
