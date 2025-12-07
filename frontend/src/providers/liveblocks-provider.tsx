/**
 * Liveblocks 프로바이더
 *
 * Liveblocks RoomProvider를 래핑하여 재사용 가능한 Provider 컴포넌트 생성
 */

"use client";

import { ReactNode, useEffect, useState } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("Liveblocks");
import { ClientSideSuspense } from "@liveblocks/react";
import { RoomProvider, getUserColor, getNoteRoomId, useStatus, useRoom, useStorage, useMutation, LiveList, LiveObject } from "@/lib/liveblocks/liveblocks.config";
import { useCurrentUser } from "@/lib/api/queries/auth.queries";
import { LoadingScreen } from "@/components/common/loading-screen";

interface LiveblocksProviderProps {
  noteId: string;
  children: ReactNode;
}

export function LiveblocksProvider({ noteId, children }: LiveblocksProviderProps) {
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // 백엔드 인증 사용자 정보 가져오기
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();

  const userId = currentUser?.id || "";
  const userName = currentUser?.name || currentUser?.email || "사용자";
  const isReady = !isUserLoading && !!currentUser;

  useEffect(() => {
    // Liveblocks API 키 확인
    const apiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
    if (!apiKey) {
      setConnectionError("Liveblocks API 키가 설정되지 않았습니다.");
      log.error("[Liveblocks] API 키가 없습니다. .env.local 파일을 확인해주세요.");
      return;
    }

    log.debug("[Liveblocks] 초기화 시작...");

    if (currentUser) {
      log.debug(`[Liveblocks] 인증된 사용자: ${userName} (${userId})`);
    }
  }, [currentUser, userName, userId]);

  // 연결 에러
  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center max-w-md px-6">
          <div className="mb-4 text-red-500">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">협업 연결 실패</h2>
          <p className="text-gray-400 mb-4">{connectionError}</p>
          <p className="text-sm text-gray-500">
            개발 모드: .env.local 파일에 NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY를 설정해주세요.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-[#AFC02B] text-black rounded hover:bg-[#9db025] transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 사용자 정보 로딩 중
  if (!isReady) {
    return (
      <div className="h-screen w-full flex items-center justify-center pt-16 md:pt-20">
        <LoadingScreen message="사용자 정보 로딩 중..." />
      </div>
    );
  }

  const roomId = getNoteRoomId(noteId);
  const userColor = getUserColor(userId);

  log.debug(`[Liveblocks] RoomProvider 초기화: Room=${roomId}, Note=${noteId}, User=${userName} (${userId}), Color=${userColor}`);

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selection: null,
        userName,
        userId,
        color: userColor,
        currentPage: 1,
        currentFileId: null,
      }}
      initialStorage={{
        noteInfo: null,
        files: [],
        pageNotes: {},
        currentPage: 1,
        currentFileId: null,
        canvasData: {},
        handRaises: new LiveList([]),
        polls: new LiveList([]),
        questions: new LiveList([]),
      }}
      autoConnect={true}
    >
      <ClientSideSuspense
        fallback={
          <div className="h-screen w-full flex items-center justify-center pt-16 md:pt-20">
            <LoadingScreen message="Liveblocks 서버 연결 중..." />
          </div>
        }
      >
        {() => {
          log.debug("[Liveblocks] ClientSideSuspense - 연결 완료! children 렌더링 시작");
          return (
            <>
              <ConnectionMonitor />
              {children}
            </>
          );
        }}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

// 연결 상태 모니터링 컴포넌트
function ConnectionMonitor() {
  const status = useStatus();
  const room = useRoom();

  // Storage 상태 모니터링
  const questions = useStorage((root) => root.questions);
  const polls = useStorage((root) => root.polls);
  const handRaises = useStorage((root) => root.handRaises);
  const noteInfo = useStorage((root) => root.noteInfo);
  const files = useStorage((root) => root.files);
  const pageNotes = useStorage((root) => root.pageNotes);
  const canvasData = useStorage((root) => root.canvasData);
  const currentPage = useStorage((root) => root.currentPage);
  const currentFileId = useStorage((root) => root.currentFileId);

  // Storage 초기화 Mutation
  const initializeStorage = useMutation(({ storage }) => {
    log.debug("[Liveblocks] Storage 초기화 시작...");

    // === 배열 필드: LiveList로 변환 (기존 데이터 보존) ===
    // handRaises
    const handRaises = storage.get("handRaises");
    if (handRaises === undefined || handRaises === null) {
      storage.set("handRaises", new LiveList([]));
      log.debug(`[Liveblocks] handRaises 초기화됨 (LiveList)`);
    } else if (Array.isArray(handRaises)) {
      storage.set("handRaises", new LiveList(handRaises));
      log.debug(`[Liveblocks] handRaises LiveList 변환 완료!`);
    }

    // polls
    const polls = storage.get("polls");
    if (polls === undefined || polls === null) {
      storage.set("polls", new LiveList([]));
      log.debug(`[Liveblocks] polls 초기화됨 (LiveList)`);
    } else if (Array.isArray(polls)) {
      storage.set("polls", new LiveList(polls));
      log.debug(`[Liveblocks] polls LiveList 변환 완료!`);
    }

    // questions
    const questions = storage.get("questions");
    if (questions === undefined || questions === null) {
      storage.set("questions", new LiveList([]));
      log.debug(`[Liveblocks] questions 초기화됨 (LiveList)`);
    } else if (Array.isArray(questions)) {
      storage.set("questions", new LiveList(questions));
      log.debug(`[Liveblocks] questions LiveList 변환 완료!`);
    }

    // files (일반 배열)
    const files = storage.get("files");
    if (files === undefined || files === null) {
      storage.set("files", []);
      log.debug(`[Liveblocks] files 초기화됨 (Array)`);
    }

    // === 객체 필드: Record 타입 (일반 객체) ===
    // pageNotes
    const pageNotes = storage.get("pageNotes");
    if (pageNotes === undefined || pageNotes === null) {
      storage.set("pageNotes", {});
      log.debug(`[Liveblocks] pageNotes 초기화됨 (Record)`);
    }

    // canvasData
    const canvasDataField = storage.get("canvasData");
    if (canvasDataField === undefined || canvasDataField === null) {
      storage.set("canvasData", {});
      log.debug(`[Liveblocks] canvasData 초기화됨 (Record)`);
    }

    // === 기타 필드 ===
    if (storage.get("currentPage") === undefined) {
      storage.set("currentPage", 1);
      log.debug("[Liveblocks] currentPage 초기화됨");
    }
    if (storage.get("currentFileId") === undefined) {
      storage.set("currentFileId", null);
      log.debug("[Liveblocks] currentFileId 초기화됨");
    }
    if (storage.get("noteInfo") === undefined) {
      storage.set("noteInfo", null);
      log.debug("[Liveblocks] noteInfo 초기화됨");
    }

    log.debug("[Liveblocks] Storage 초기화/변환 완료!");
  }, []);

  useEffect(() => {
    log.debug("[Liveblocks] ConnectionMonitor 마운트됨 - RoomProvider 내부 렌더링 성공!");
  }, []);

  useEffect(() => {
    log.debug(`[Liveblocks] 연결 상태 변경: ${status}`);

    // 연결되면 Storage 초기화 (필요한 경우)
    if (status === "connected") {
      log.debug("[Liveblocks] 연결됨! Storage 초기화 시도...");
      initializeStorage();
    }
  }, [status, initializeStorage]);

  useEffect(() => {
    if (room) {
      log.debug(`[Liveblocks] Room 객체 사용 가능: id=${room.id}`);
    }
  }, [room]);

  // Storage 변경 감지
  useEffect(() => {
    log.debug(`[Liveblocks Storage] 전체 상태:`, {
      questions: questions?.length ?? 'undefined',
      polls: polls?.length ?? 'undefined',
      handRaises: handRaises?.length ?? 'undefined',
      files: files?.length ?? 'undefined',
      filesData: files?.map(f => ({ id: f.id, fileName: f.fileName })),
      noteInfo: noteInfo ? { id: noteInfo.id, title: noteInfo.title } : 'null',
      pageNotes: pageNotes ? Object.keys(pageNotes).length : 'undefined',
      canvasData: canvasData ? Object.keys(canvasData).length : 'undefined',
      currentPage: currentPage ?? 'undefined',
      currentFileId: currentFileId ?? 'undefined',
    });
  }, [questions, polls, handRaises, noteInfo, files, pageNotes, canvasData, currentPage, currentFileId]);

  return null;
}
