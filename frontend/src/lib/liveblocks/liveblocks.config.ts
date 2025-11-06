/**
 * Liveblocks 설정
 *
 * 실시간 협업 기능을 위한 Liveblocks 클라이언트 설정
 */

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Liveblocks 클라이언트 생성
const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY || "",

  // 인증이 필요한 경우 (향후 구현)
  // authEndpoint: "/api/liveblocks-auth",

  // 연결 옵션
  throttle: 16, // 16ms마다 업데이트 (60fps)
});

// Room 타입 정의
type Presence = {
  cursor: { x: number; y: number } | null;
  selection: string | null;
  userName: string;
  userId: string;
  color: string; // 사용자 고유 색상
};

type Storage = {
  // Canvas 상태 (Fabric.js 오브젝트)
  canvas: any; // Yjs Document로 대체 가능

  // 협업 상태
  handRaises: any; // 손들기
  polls: any; // 투표
  emojiReactions: any; // 이모지
  questions: any; // 질문/답변
};

type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    picture?: string;
    role: "educator" | "student";
  };
};

type RoomEvent = {
  type: "EMOJI_REACTION" | "HAND_RAISE" | "POLL_VOTE" | "QUESTION_ADDED";
  userId: string;
  data: any;
};

// Room Context 생성
export const {
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
  useBatch,
  useStatus,
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
export function getNoteRoomId(noteId: string): string {
  return `note-${noteId}`;
}
