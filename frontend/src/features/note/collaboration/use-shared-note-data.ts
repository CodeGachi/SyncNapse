/**
 * 공유 모드에서 Liveblocks Storage로부터 노트 데이터를 로드하는 Custom Hook
 *
 * 공유 링크로 접속한 학생들이 Liveblocks Storage에 저장된 노트 데이터를 읽어옵니다.
 */

"use client";

import { useEffect, useState } from "react";
import { useStorage } from "@/lib/liveblocks/liveblocks.config";
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
    setFiles,
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
          console.log(`[공유 모드] IndexedDB에 노트 이미 존재: ${existingNote.title}`);
          setNoteCreated(true);
          return;
        }

        // 2. 백엔드 API로 노트 fetch 시도
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (apiUrl) {
          try {
            console.log(`[공유 모드] 백엔드에서 노트 fetch 시도: ${apiUrl}/notes/${noteId}`);
            const response = await fetch(`${apiUrl}/notes/${noteId}`);

            if (response.ok) {
              const backendNote = await response.json();
              console.log(`[공유 모드] 백엔드에서 노트 받음:`, backendNote);

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

              console.log(`[공유 모드] 백엔드 노트를 IndexedDB에 저장 완료`);
              setNoteCreated(true);
              return;
            }
          } catch (error) {
            console.warn(`[공유 모드] 백엔드 fetch 실패:`, error);
          }
        }

        // 3. 백엔드 실패 시 임시 빈 노트 생성
        console.log(`[공유 모드] 임시 빈 노트 생성 중...`);
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

        console.log(`[공유 모드] 임시 빈 노트 생성 완료:`, tempNote.title);
        console.log(`[공유 모드] 협업 기능 테스트를 위한 임시 노트입니다. 백엔드 연결 시 실제 노트로 대체됩니다.`);
        setNoteCreated(true);
      } catch (error) {
        console.error(`[공유 모드] 노트 생성 오류:`, error);
      }
    };

    ensureNoteExists();
  }, [isSharedView, noteId, noteCreated]);

  // 공유 모드일 때 Liveblocks Storage의 데이터를 로컬 store에 동기화
  useEffect(() => {
    if (!isSharedView || !noteInfo) {
      console.log("[공유 모드] 대기 중:", { isSharedView, hasNoteInfo: !!noteInfo });
      return;
    }

    console.log("[공유 모드] Liveblocks Storage에서 노트 데이터 로드 중...");
    console.log("[공유 모드] noteInfo:", noteInfo);
    console.log("[공유 모드] files 수:", files?.length || 0);

    // 파일 목록 동기화
    if (files && files.length > 0) {
      // TODO: 백엔드 API 구현 후 실제 파일 다운로드
      // Student는 Liveblocks Storage에서 파일 메타데이터를 받고,
      // 백엔드 API를 통해 실제 파일을 다운로드하여 IndexedDB에 저장

      console.log(`[공유 모드] 파일 메타데이터 ${files.length}개 발견`);
      console.log(`[공유 모드] TODO: 백엔드 API로 파일 다운로드 필요`);

      const fileData = files.map((file) => ({
        id: file.id,
        name: file.fileName,
        type: file.fileType,
        size: file.fileSize,
        url: file.fileUrl || "", // Backend URL (영구 URL)
        uploadedAt: new Date(file.uploadedAt).toISOString(),
      }));

      setFiles(fileData);
      console.log(`[공유 모드] 파일 ${fileData.length}개 메타데이터 로드 완료`);
    } else {
      // 파일이 없으면 빈 배열로 설정 (임시 - 백엔드 구현 시 파일 다운로드)
      console.log(`[공유 모드] 파일 없음 - 협업 기능만 사용 가능`);
    }

    // 현재 파일 및 페이지 동기화
    if (currentFileId) {
      setSelectedFileId(currentFileId);
      console.log(`[공유 모드] 현재 파일 ID: ${currentFileId}`);
    }

    if (currentPage) {
      setCurrentPage(currentPage);
      console.log(`[공유 모드] 현재 페이지: ${currentPage}`);
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
      console.log(`[공유 모드] 필기 ${Object.keys(notesData).length}개 페이지 로드 완료`);
    }

    console.log("[공유 모드] 노트 데이터 로드 완료:", noteInfo.title);
  }, [
    isSharedView,
    noteInfo,
    files,
    pageNotes,
    currentFileId,
    currentPage,
    setFiles,
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
