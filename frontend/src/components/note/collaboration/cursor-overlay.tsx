/**
 * CursorOverlay
 *
 * 다른 사용자들의 커서를 실시간으로 표시하는 오버레이 컴포넌트
 * - 하이브리드 모드: 드로잉 모드일 때 펜 아이콘, 일반 모드일 때 포인터 아이콘
 * - pointerEvents: none으로 드로잉/텍스트 선택 방해하지 않음
 */

"use client";

import { useOthersCursors, type CursorData } from "@/features/note/collaboration/use-cursor-presence";

/**
 * 포인터 커서 아이콘 (일반 모드)
 */
function PointerCursor({ color }: { color: string }) {
  return (
    <svg
      data-testid="cursor-icon-pointer"
      width="14"
      height="20"
      viewBox="0 0 20 28"
      fill="none"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      <path
        d="M4 4L4 22L8 18L12 26L16 24L12 16L18 14L4 4Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/**
 * 펜 커서 아이콘 (드로잉 모드)
 */
function PenCursor({ color }: { color: string }) {
  return (
    <svg
      data-testid="cursor-icon-pen"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      <path
        d="M3 21L5 13L16 2L22 8L11 19L3 21Z"
        fill={color}
        stroke="white"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 2L22 8"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="5" cy="19" r="2" fill="white" />
    </svg>
  );
}

/**
 * 단일 커서 컴포넌트
 */
function Cursor({ cursor }: { cursor: CursorData }) {
  const { connectionId, x, y, name, color, isDrawingMode } = cursor;

  return (
    <div
      data-testid={`cursor-${connectionId}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-2px, -2px)",
        transition: "left 0.05s linear, top 0.05s linear",
      }}
    >
      {/* 커서 아이콘 (모드에 따라 다름) */}
      {isDrawingMode ? (
        <PenCursor color={color} />
      ) : (
        <PointerCursor color={color} />
      )}

      {/* 사용자 이름 라벨 */}
      <span
        style={{
          position: "absolute",
          left: isDrawingMode ? 14 : 12,
          top: isDrawingMode ? 12 : 16,
          backgroundColor: color,
          color: "white",
          fontSize: "10px",
          fontWeight: 500,
          padding: "1px 4px",
          borderRadius: "3px",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        {name}
      </span>
    </div>
  );
}

interface CursorOverlayProps {
  width: number;
  height: number;
  educatorOnly?: boolean;
}

/**
 * 커서 오버레이 컴포넌트
 */
export function CursorOverlay({
  width,
  height,
  educatorOnly = false,
}: CursorOverlayProps) {
  const cursors = useOthersCursors({ educatorOnly });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        zIndex: 20,
        overflow: "hidden",
      }}
    >
      {cursors.map((cursor) => (
        <Cursor key={cursor.connectionId} cursor={cursor} />
      ))}
    </div>
  );
}
