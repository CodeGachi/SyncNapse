/**
 * Liveblocks Provider
 *
 * Liveblocks RoomProvider를 래핑하여 재사용 가능한 Provider 컴포넌트 생성
 */

"use client";

import { ReactNode, useEffect, useState } from "react";
import { RoomProvider, getUserColor, getNoteRoomId } from "@/lib/liveblocks/liveblocks.config";

interface LiveblocksProviderProps {
  noteId: string;
  children: ReactNode;
}

export function LiveblocksProvider({ noteId, children }: LiveblocksProviderProps) {
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 사용자 정보 가져오기 (localStorage 또는 인증 시스템)
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");

    if (storedUserId && storedUserName) {
      setUserId(storedUserId);
      setUserName(storedUserName);
      setIsReady(true);
    } else {
      // 임시 사용자 정보 생성
      const tempUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const tempUserName = `사용자${Math.floor(Math.random() * 1000)}`;

      localStorage.setItem("userId", tempUserId);
      localStorage.setItem("userName", tempUserName);

      setUserId(tempUserId);
      setUserName(tempUserName);
      setIsReady(true);
    }
  }, []);

  // 사용자 정보 로딩 중
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#AFC02B] mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">연결 중...</p>
        </div>
      </div>
    );
  }

  const roomId = getNoteRoomId(noteId);
  const userColor = getUserColor(userId);

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
        currentPage: 1,
        currentFileId: null,
        canvasData: {},
        handRaises: [],
        polls: [],
        questions: [],
      }}
    >
      {children}
    </RoomProvider>
  );
}
