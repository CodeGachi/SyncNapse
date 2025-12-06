/**
 * use-cursor-presence
 *
 * Liveblocks Presence를 활용한 실시간 커서 위치 공유 훅
 * - useCursorBroadcast: 내 커서 위치를 브로드캐스트
 * - useOthersCursors: 다른 사용자 커서 구독
 */

import { useCallback, useEffect } from "react";
import { useUpdateMyPresence, useOthers } from "@/lib/liveblocks";

/**
 * 내 커서 위치를 Presence로 브로드캐스트하는 훅
 * @param containerRef - 커서 추적 영역의 ref
 * @param isDrawingMode - 드로잉 모드 여부 (커서 아이콘 변경용)
 * @param enabled - 훅 활성화 여부 (협업 모드일 때만 true)
 */
export function useCursorBroadcast(
  containerRef: React.RefObject<HTMLElement>,
  isDrawingMode: boolean,
  enabled: boolean = true
) {
  const updateMyPresence = useUpdateMyPresence();

  // 마우스 이동 시 커서 위치 업데이트
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 컨테이너 영역 내부인지 체크
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        updateMyPresence({
          cursor: { x, y },
          isDrawingMode,
        });
      }
    },
    [updateMyPresence, containerRef, isDrawingMode]
  );

  // 마우스가 영역을 벗어나면 커서 숨기기
  const handlePointerLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      // cleanup 시 커서 제거
      updateMyPresence({ cursor: null });
    };
  }, [containerRef, handlePointerMove, handlePointerLeave, enabled, updateMyPresence]);
}

/**
 * 커서 데이터 타입
 */
export interface CursorData {
  connectionId: number;
  x: number;
  y: number;
  name: string;
  color: string;
  isDrawingMode: boolean;
}

/**
 * 다른 사용자들의 커서를 구독하는 훅
 */
export function useOthersCursors(options: {
  educatorOnly?: boolean;
}): CursorData[] {
  const { educatorOnly = false } = options;
  const others = useOthers();

  const cursors = others
    .filter((other) => {
      // 커서가 없으면 제외
      if (!other.presence.cursor) return false;
      // educatorOnly면 educator만
      if (educatorOnly && other.info?.role !== "educator") return false;
      return true;
    })
    .map((other) => ({
      connectionId: other.connectionId,
      x: other.presence.cursor!.x,
      y: other.presence.cursor!.y,
      name: other.presence.userName,
      color: other.presence.color,
      isDrawingMode: other.presence.isDrawingMode ?? false,
    }));

  return cursors;
}
