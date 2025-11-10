/**
 * Liveblocks Provider
 *
 * Liveblocks RoomProvider를 래핑하여 재사용 가능한 Provider 컴포넌트 생성
 */

"use client";

import { ReactNode, useEffect, useState } from "react";
import { ClientSideSuspense } from "@liveblocks/react";
import { RoomProvider, getUserColor, getNoteRoomId } from "@/lib/liveblocks/liveblocks.config";

interface LiveblocksProviderProps {
  noteId: string;
  children: ReactNode;
}

export function LiveblocksProvider({ noteId, children }: LiveblocksProviderProps) {
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Liveblocks API 키 확인
    const apiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
    if (!apiKey) {
      setConnectionError("Liveblocks API 키가 설정되지 않았습니다.");
      console.error("[Liveblocks Error] API 키가 없습니다. .env.local 파일을 확인해주세요.");
      return;
    }

    console.log("[Liveblocks] 초기화 시작...");

    // 사용자 정보 가져오기 (localStorage 또는 인증 시스템)
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");

    if (storedUserId && storedUserName) {
      setUserId(storedUserId);
      setUserName(storedUserName);
      setIsReady(true);
      console.log(`[Liveblocks] 사용자 정보 로드 완료: ${storedUserName} (${storedUserId})`);
    } else {
      // 임시 사용자 정보 생성
      const tempUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const tempUserName = `사용자${Math.floor(Math.random() * 1000)}`;

      localStorage.setItem("userId", tempUserId);
      localStorage.setItem("userName", tempUserName);

      setUserId(tempUserId);
      setUserName(tempUserName);
      setIsReady(true);
      console.log(`[Liveblocks] 임시 사용자 생성 완료: ${tempUserName} (${tempUserId})`);
    }
  }, []);

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
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#AFC02B] mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">사용자 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  const roomId = getNoteRoomId(noteId);
  const userColor = getUserColor(userId);

  console.log(`[Liveblocks] RoomProvider 초기화 중...`);
  console.log(`  - Room ID: ${roomId}`);
  console.log(`  - User: ${userName} (${userId})`);
  console.log(`  - Color: ${userColor}`);

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
        handRaises: [],
        polls: [],
        questions: [],
      }}
      autoConnect={true}
    >
      <ClientSideSuspense
        fallback={
          <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#AFC02B] mx-auto mb-4"></div>
              <p className="text-gray-400 text-lg">Liveblocks 서버 연결 중...</p>
              <p className="text-gray-500 text-sm mt-2">실시간 협업을 준비하고 있습니다</p>
            </div>
          </div>
        }
      >
        {() => {
          console.log("[Liveblocks] ClientSideSuspense - 연결 완료! children 렌더링 시작");
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
  useEffect(() => {
    console.log("[Liveblocks] ConnectionMonitor 마운트됨 - RoomProvider 내부 렌더링 성공!");
  }, []);

  return null;
}
