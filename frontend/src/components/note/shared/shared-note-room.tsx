/**
 * 공유 노트 Room 컴포넌트
 *
 * Liveblocks RoomProvider로 래핑된 실시간 협업 노트
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RoomProvider, getUserColor, getNoteRoomId } from "@/lib/liveblocks/liveblocks.config";
import { NoteSidebar } from "@/components/note/note-structure/note-sidebar";
import { NoteContentArea } from "@/components/note/note-structure/note-content-area";
import { RightSidePanel } from "@/components/note/note-structure/right-side-panel";
import { SidebarIcons } from "@/components/note/note-structure/sidebar-icons";
import { NoteDataLoader } from "@/components/note/note-structure/note-data-loader";
import { NoteLayoutWrapper } from "@/components/note/note-structure/note-layout-wrapper";

interface SharedNoteRoomProps {
  token: string;
}

export function SharedNoteRoom({ token }: SharedNoteRoomProps) {
  const router = useRouter();
  const [noteData, setNoteData] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. 토큰 검증 및 노트 정보 조회
  useEffect(() => {
    async function validateToken() {
      try {
        setIsLoading(true);

        // TODO: 백엔드 API 호출하여 토큰 검증
        // const response = await fetch(`/api/shared-notes/validate?token=${token}`);
        // const data = await response.json();

        // 임시 Mock 데이터
        const mockData = {
          noteId: "shared-note-1",
          noteTitle: "공유 노트 예시",
          isValid: true,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24시간 후
        };

        if (!mockData.isValid) {
          setError("유효하지 않은 공유 링크입니다.");
          return;
        }

        if (mockData.expiresAt < Date.now()) {
          setError("만료된 공유 링크입니다.");
          return;
        }

        setNoteData(mockData);
      } catch (err) {
        console.error("Token validation failed:", err);
        setError("공유 노트를 불러올 수 없습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    validateToken();
  }, [token]);

  // 2. 사용자 이름 입력 (최초 1회)
  useEffect(() => {
    const storedName = localStorage.getItem(`shared-note-user-${token}`);
    if (storedName) {
      setUserName(storedName);
    } else {
      const name = prompt("이름을 입력하세요:");
      if (name) {
        setUserName(name);
        localStorage.setItem(`shared-note-user-${token}`, name);
      } else {
        // 이름 입력 취소 시 랜덤 이름
        const randomName = `참여자${Math.floor(Math.random() * 1000)}`;
        setUserName(randomName);
        localStorage.setItem(`shared-note-user-${token}`, randomName);
      }
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#AFC02B] mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">공유 노트 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1e1e1e]">
        <div className="text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-4">접근 불가</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <button
            onClick={() => router.push("/dashboard/main")}
            className="px-6 py-3 bg-[#AFC02B] text-[#1E1E1E] rounded-lg font-bold hover:bg-[#9DAF25] transition-colors"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!noteData || !userName) {
    return null;
  }

  const roomId = getNoteRoomId(noteData.noteId);
  const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
      <div className="flex items-start bg-[#1e1e1e] h-screen w-full">
        {/* Left Sidebar */}
        <NoteSidebar />

        {/* Main Content */}
        <NoteDataLoader noteId={noteData.noteId}>
          <NoteLayoutWrapper>
            {/* 공유 노트 헤더 */}
            <SharedNoteHeader
              noteTitle={noteData.noteTitle}
              userName={userName}
              userColor={userColor}
            />

            <NoteContentArea noteId={noteData.noteId} noteTitle={noteData.noteTitle} />
            <RightSidePanel noteId={noteData.noteId} />
            <SidebarIcons noteId={noteData.noteId} />
          </NoteLayoutWrapper>
        </NoteDataLoader>
      </div>
    </RoomProvider>
  );
}

interface SharedNoteHeaderProps {
  noteTitle: string;
  userName: string;
  userColor: string;
}

function SharedNoteHeader({ noteTitle, userName, userColor }: SharedNoteHeaderProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#2F2F2F] px-6 py-3 rounded-full shadow-lg border border-[#3C3C3C]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: userColor }}
          />
          <span className="text-white font-medium">{userName}</span>
        </div>
        <div className="w-px h-4 bg-gray-600" />
        <span className="text-gray-400">
          {noteTitle}
        </span>
      </div>
    </div>
  );
}
