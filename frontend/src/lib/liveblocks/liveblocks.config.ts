/**
 * Liveblocks 설정
 *
 * 실시간 협업 기능을 위한 Liveblocks 클라이언트 설정
 * - PDF 페이지 동기화
 * - Fabric.js Canvas 필기 동기화
 * - 협업 기능 (손들기, 투표, 이모지, Q&A)
 */

import { createClient, LiveList, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { getAccessToken } from "@/lib/auth/token-manager";

// Liveblocks 클라이언트 생성
// Note: Public key가 설정되지 않은 경우 에러 방지를 위해 기본값 사용
const publicKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;

// DEBUG: Check if Liveblocks key is configured
if (!publicKey || publicKey === "") {
  console.warn(
    "[Liveblocks] ⚠️ NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is not configured. " +
    "Real-time collaboration features will not work. " +
    "Please add your Liveblocks public key to .env file. " +
    "Get your key from https://liveblocks.io/dashboard"
  );
}

const client = createClient({
  // 백엔드 인증 엔드포인트 사용 (권한 검증)
  authEndpoint: async (room) => {
    // 쿠키에서 JWT 토큰 가져오기 (token-manager 사용)
    const token = getAccessToken();

    const response = await fetch("/api/liveblocks-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ room }),
    });

    if (!response.ok) {
      throw new Error(`Liveblocks auth failed: ${response.status}`);
    }

    return response.json();
  },

  // 연결 옵션
  throttle: 16, // 16ms마다 업데이트 (60fps)
});

// Presence 타입: 실시간 사용자 상태
type Presence = {
  // 커서 위치
  cursor: { x: number; y: number } | null;

  // 현재 선택 중인 오브젝트
  selection: string | null;

  // 사용자 정보
  userName: string;
  userId: string;
  color: string; // 사용자 고유 색상

  // 현재 보고 있는 페이지
  currentPage: number;

  // 현재 선택된 파일 ID
  currentFileId: string | null;
};

// Storage 타입: 영구 저장 상태
type Storage = {
  // === 노트 기본 정보 (공유 모드용) ===
  noteInfo: {
    id: string;
    title: string;
    type: "student" | "educator";
    folderId: string | null;
    createdAt: number;
    updatedAt: number;
  } | null;

  // === 파일 목록 (공유 모드용) ===
  files: Array<{
    id: string;
    noteId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string; // Backend URL (영구 URL)
    totalPages?: number;
    uploadedAt: number;
  }>;

  // === 필기 데이터 (공유 모드용) ===
  // Key: "fileId-pageNum", Value: NoteBlock[]
  pageNotes: Record<string, Array<{
    id: string;
    type: "text" | "checklist";
    content: string;
    checked?: boolean;
    order: number;
    createdAt: number;
  }>>;

  // === PDF 뷰어 상태 ===
  currentPage: number;          // 현재 페이지 번호 (Educator가 제어)
  currentFileId: string | null; // 현재 열린 파일 ID

  // === Fabric.js Canvas 상태 ===
  // 페이지별 Canvas 오브젝트 저장
  // Key: "fileId-pageNum", Value: Fabric.js JSON
  canvasData: Record<string, {
    version: string;
    objects: any[];
    background: string;
  }>;

  // === 협업 상태 ===
  handRaises: LiveList<{
    id: string;
    userId: string;
    userName: string;
    timestamp: number;
    isActive: boolean;
  }>;

  polls: LiveList<{
    id: string;
    question: string;
    options: Array<{
      text: string;
      votes: string[]; // userId[]
    }>;
    createdBy: string;
    createdAt: number;
    isActive: boolean;
  }>;

  questions: LiveList<{
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: number;
    answers: Array<{
      id: string;
      content: string;
      authorId: string;
      authorName: string;
      createdAt: number;
      isBest: boolean;
    }>;
    upvotes: string[]; // userId[]
    isPinned: boolean;
    isSharedToAll: boolean;
  }>;
};

// UserMeta 타입: 사용자 메타데이터
type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    picture?: string;
    role: "educator" | "student";
  };
};

// RoomEvent 타입: 브로드캐스트 이벤트
type RoomEvent =
  // 이모지
  | { type: "EMOJI_REACTION"; userId: string; userName: string; emoji: string; timestamp: number }
  // 손들기
  | { type: "HAND_RAISE"; userId: string; userName: string }
  | { type: "HAND_LOWER"; userId: string }
  // 투표
  | { type: "POLL_CREATED"; pollId: string; question: string }
  | { type: "POLL_VOTE"; pollId: string; optionIndex: number; userId: string }
  | { type: "POLL_ENDED"; pollId: string }
  // Q&A 질문
  | { type: "QUESTION_ADDED"; questionId: string; content: string; authorName: string }
  | { type: "QUESTION_UPVOTED"; questionId: string; userId: string }
  | { type: "QUESTION_DELETED"; questionId: string }
  // Q&A 답변
  | { type: "ANSWER_ADDED"; questionId: string; answerId: string; authorName: string }
  | { type: "ANSWER_DELETED"; questionId: string; answerId: string }
  | { type: "ANSWER_MARKED_BEST"; questionId: string; answerId: string }
  // PDF/Canvas
  | { type: "PAGE_CHANGE"; page: number; fileId: string }
  | { type: "CANVAS_UPDATE"; fileId: string; pageNum: number };

// Room Context 생성
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useOthers,
    useSelf,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useMutation,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useStatus,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

// 사용자 색상 생성 (userId 기반)
export function getUserColor(userId: string): string {
  const colors = [
    "#E57373", // Red
    "#F06292", // Pink
    "#BA68C8", // Purple
    "#9575CD", // Deep Purple
    "#7986CB", // Indigo
    "#64B5F6", // Blue
    "#4FC3F7", // Light Blue
    "#4DD0E1", // Cyan
    "#4DB6AC", // Teal
    "#81C784", // Green
    "#AED581", // Light Green
    "#DCE775", // Lime
    "#FFD54F", // Amber
    "#FFB74D", // Orange
    "#FF8A65", // Deep Orange
  ];

  // userId를 해시하여 색상 인덱스 생성
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Room ID 생성 헬퍼
// 백엔드와 동일한 형식 사용: "note:{noteId}"
export function getNoteRoomId(noteId: string): string {
  return `note:${noteId}`;
}

// Canvas Data Key 생성 헬퍼
export function getCanvasKey(fileId: string, pageNum: number): string {
  return `${fileId}-${pageNum}`;
}

// LiveList, LiveObject export (Storage 초기화용)
export { LiveList, LiveObject };
