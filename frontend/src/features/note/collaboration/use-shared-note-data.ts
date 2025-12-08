/**
 * 공유 모드에서 Liveblocks Storage로부터 노트 데이터를 로드하는 Custom Hook
 *
 * 공유 링크로 접속한 학생들이 Liveblocks Storage에 저장된 노트 데이터를 읽어옵니다.
 */

"use client";

import { useEffect, useState } from "react";
import { useStorage } from "@/lib/liveblocks/liveblocks.config";
import { createLogger } from "@/lib/utils/logger";
import { decodeFilename } from "@/lib/utils/decode-filename";

const log = createLogger("SharedNoteData");
import { useNoteEditorStore } from "@/stores";
import { initDB } from "@/lib/db";
import type { DBNote } from "@/lib/db";
import { getAccessToken } from "@/lib/auth/token-manager";

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

  // 파일 fetch 완료 여부 추적
  const [filesFetched, setFilesFetched] = useState(false);

  // 공유 모드일 때 백엔드에서 파일을 가져오기 (한 번만 실행)
  useEffect(() => {
    if (!isSharedView || !noteInfo || filesFetched) {
      return;
    }

    log.debug("⭐ 공유 모드 - 백엔드에서 파일 로드 시작...");
    log.debug("noteInfo:", noteInfo);

    // ⭐ 백엔드에서 파일 목록 + 실제 파일 데이터 가져오기
    const fetchFilesFromBackend = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          log.warn("API URL이 설정되지 않음");
          setFilesFetched(true);
          return;
        }

        // 1. 파일 목록 가져오기
        const filesUrl = `${apiUrl}/notes/${noteId}/files`;
        log.debug(`백엔드에서 파일 목록 fetch: ${filesUrl}`);

        const token = getAccessToken();
        const response = await fetch(filesUrl, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          log.warn(`파일 목록 fetch 실패: ${response.status}`, errorText);
          setFilesFetched(true);
          return;
        }

        const responseData = await response.json();
        log.debug("백엔드 파일 목록 응답:", responseData);

        // HAL 형식 지원: items 배열 또는 직접 배열
        const backendFiles = Array.isArray(responseData)
          ? responseData
          : (responseData.items || responseData.files || []);

        log.debug(`백엔드에서 파일 ${backendFiles.length}개 메타데이터 받음`);

        if (backendFiles.length === 0) {
          log.debug("백엔드에 파일 없음");
          setFilesFetched(true);
          return;
        }

        // 2. 각 파일의 실제 데이터 다운로드 (Base64 -> Blob URL)
        const fileDataPromises = backendFiles.map(async (backendFile: any) => {
          const backendFileId = backendFile.id;
          const rawFileName = backendFile.file_name || backendFile.fileName;
          const fileName = decodeFilename(rawFileName);
          const fileType = backendFile.file_type || backendFile.fileType;
          const fileSize = backendFile.file_size || backendFile.fileSize;
          const uploadedAt = backendFile.uploaded_at || backendFile.uploadedAt || backendFile.createdAt || new Date().toISOString();

          // Liveblocks에서 같은 파일 찾기 (드로잉 동기화용 ID)
          const liveblocksFile = files?.find(
            (f) => f.fileName === fileName || decodeFilename(f.fileName) === fileName || f.id === backendFileId
          );
          const fileId = liveblocksFile?.id || backendFileId;

          try {
            // 파일 다운로드 (Base64로 받음)
            const downloadUrl = `${apiUrl}/notes/${noteId}/files/${backendFileId}/download`;
            log.debug(`파일 다운로드: ${fileName} from ${downloadUrl}`);

            const downloadRes = await fetch(downloadUrl, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });

            if (!downloadRes.ok) {
              log.error(`파일 다운로드 실패 ${fileName}: ${downloadRes.status}`);
              return null;
            }

            const downloadData = await downloadRes.json();

            if (!downloadData.data) {
              log.error(`파일 데이터 없음: ${fileName}`);
              return null;
            }

            // Base64 -> Blob -> Blob URL
            const base64Data = downloadData.data;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: fileType });
            const blobUrl = URL.createObjectURL(blob);

            log.debug(`✅ 파일 다운로드 완료: ${fileName}, Blob URL 생성`);

            return {
              id: fileId,
              name: fileName,
              type: fileType,
              size: fileSize,
              url: blobUrl, // ⭐ Blob URL (PDF 뷰어에서 사용)
              uploadedAt: uploadedAt,
              backendId: backendFileId,
            };
          } catch (error) {
            log.error(`파일 다운로드 오류 ${fileName}:`, error);
            return null;
          }
        });

        const fileDataResults = await Promise.all(fileDataPromises);
        const validFileData = fileDataResults.filter((f): f is NonNullable<typeof f> => f !== null);

        if (validFileData.length > 0) {
          loadFiles(validFileData);
          log.debug(`⭐ 파일 ${validFileData.length}개 다운로드 및 스토어 로드 완료`);
        } else {
          log.warn("다운로드된 파일 없음");
        }

        setFilesFetched(true);
      } catch (error) {
        log.error("백엔드 파일 fetch 오류:", error);
        setFilesFetched(true);
      }
    };

    fetchFilesFromBackend();
  }, [isSharedView, noteId, noteInfo, filesFetched, files, loadFiles]);

  // Liveblocks 상태 동기화 (파일 제외, 페이지/필기 데이터만)
  useEffect(() => {
    if (!isSharedView || !noteInfo) {
      return;
    }

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
    noteInfo,
    pageNotes,
    currentFileId,
    currentPage,
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
    // 공유 모드 로딩 조건:
    // 1. 임시 노트 생성 완료 대기 (noteCreated)
    // 2. Liveblocks noteInfo 로드 대기
    // 3. 백엔드 파일 fetch 완료 대기 (filesFetched)
    isLoading: isSharedView && (!noteCreated || noteInfo === undefined || !filesFetched),
  };
}
