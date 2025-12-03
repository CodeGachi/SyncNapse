/**
 * 손들기 기능 훅 (Liveblocks 실시간 버전)
 *
 * Liveblocks Storage를 사용하여 실시간 손들기 기능 제공
 * - 학생이 손들기 버튼 클릭 → Storage에 추가
 * - Educator가 손들기 목록 확인 및 응답
 */

import { useEffect } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useHandRaise");

/** 손들기 데이터 타입 */
export interface HandRaise {
  id: string;
  userId: string;
  userName: string;
  timestamp: number;
  isActive: boolean;
}

interface UseHandRaiseProps {
  userId: string;
  userName: string;
  isEducator?: boolean;
}

interface UseHandRaiseReturn {
  /** 전체 손들기 목록 */
  handRaises: readonly HandRaise[];
  /** 활성화된 손들기 목록 (오래된 순 정렬) */
  activeHandRaises: HandRaise[];
  /** 현재 사용자의 손들기 정보 */
  myHandRaise: HandRaise | undefined;
  /** 현재 사용자가 손들기 중인지 여부 */
  isHandRaised: boolean;
  /** 손들기 (Student) */
  handleRaiseHand: () => void;
  /** 손들기 응답 (Educator) */
  handleRespond: (handRaiseId: string) => void;
  /** 모든 손들기 제거 (Educator) */
  handleClearAll: () => void;
}

/**
 * 손들기 기능 커스텀 훅
 */
export function useHandRaise({
  userId,
  userName,
  isEducator = false,
}: UseHandRaiseProps): UseHandRaiseReturn {
  // Liveblocks Storage에서 손들기 목록 가져오기
  const handRaises = useStorage((root) => root.handRaises) || [];
  const broadcast = useBroadcastEvent();

  // 손들기 목록 변경 감지 (디버깅용)
  useEffect(() => {
    log.debug("손들기 목록 업데이트:", {
      userId,
      userName,
      isEducator,
      totalHandRaises: handRaises.length,
      activeHandRaises: handRaises.filter((h) => h.isActive).length,
      handRaises: handRaises
        .filter((h) => h.isActive)
        .map((h) => ({
          id: h.id,
          user: h.userName,
          timestamp: new Date(h.timestamp).toLocaleTimeString(),
        })),
    });
  }, [handRaises, userId, userName, isEducator]);

  // 현재 사용자가 손들기 중인지 확인
  const myHandRaise = handRaises.find(
    (h) => h.userId === userId && h.isActive
  );
  const isHandRaised = !!myHandRaise;

  // 손들기 추가 Mutation (Student)
  const raiseHand = useMutation(
    ({ storage }, inputUserName: string, inputUserId: string) => {
      log.debug("Storage 접근 시작");
      const handRaisesStorage = storage.get("handRaises");
      log.debug("현재 handRaises 배열:", handRaisesStorage);
      log.debug(
        "handRaises 타입:",
        typeof handRaisesStorage,
        Array.isArray(handRaisesStorage)
      );

      // 중복 방지: 이미 손들기 중이면 무시
      const existing = handRaisesStorage.find(
        (h) => h.userId === inputUserId && h.isActive
      );
      if (existing) {
        log.debug("이미 손들기 중:", inputUserId);
        return;
      }

      // 새 손들기 추가
      const newHandRaise = {
        id: `hand-${inputUserId}-${Date.now()}`,
        userId: inputUserId,
        userName: inputUserName,
        timestamp: Date.now(),
        isActive: true,
      };

      log.debug("새 손들기 생성:", newHandRaise);
      handRaisesStorage.push(newHandRaise);
      log.debug("손들기 추가 후 배열 길이:", handRaisesStorage.length);
    },
    []
  );

  // 손들기 제거 Mutation (Student 본인 또는 Educator)
  const lowerHand = useMutation(({ storage }, handRaiseId: string) => {
    const handRaisesStorage = storage.get("handRaises");
    const index = handRaisesStorage.findIndex((h) => h.id === handRaiseId);

    if (index !== -1) {
      const handRaise = handRaisesStorage.get(index);
      if (!handRaise) return;
      // LiveList 중첩 객체 문제: 전체 객체를 새로 만들어 set()으로 교체
      handRaisesStorage.set(index, { ...handRaise, isActive: false });
    }
  }, []);

  // 모든 손들기 제거 Mutation (Educator만)
  const clearAllHandRaises = useMutation(({ storage }) => {
    const handRaisesStorage = storage.get("handRaises");
    // LiveList 중첩 객체 문제: 각 항목을 set()으로 교체
    for (let i = 0; i < handRaisesStorage.length; i++) {
      const handRaise = handRaisesStorage.get(i);
      if (!handRaise) continue;
      if (handRaise.isActive) {
        handRaisesStorage.set(i, { ...handRaise, isActive: false });
      }
    }
  }, []);

  // 손들기 버튼 클릭 (Student) - 한 번만 가능
  const handleRaiseHand = () => {
    if (!isHandRaised) {
      log.debug("손들기 시작:", { userId, userName });
      raiseHand(userName, userId);
      log.debug("raiseHand Mutation 호출 완료");
      broadcast({
        type: "HAND_RAISE",
        userId,
        userName,
      });
    }
  };

  // Educator: 특정 손들기 응답
  const handleRespond = (handRaiseId: string) => {
    lowerHand(handRaiseId);
  };

  // 모든 손들기 제거
  const handleClearAll = () => {
    clearAllHandRaises();
  };

  // 활성화된 손들기만 필터링 및 정렬 (오래된 순)
  const activeHandRaises = handRaises
    .filter((h) => h.isActive)
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    handRaises,
    activeHandRaises,
    myHandRaise,
    isHandRaised,
    handleRaiseHand,
    handleRespond,
    handleClearAll,
  };
}

/** 손들기 이벤트 리스너 훅 (Educator용 알림) */
export function useHandRaiseEventListener(
  isEducator: boolean,
  onHandRaise: (userName: string) => void
) {
  useEventListener(({ event }) => {
    if (!isEducator) return;

    if (event.type === "HAND_RAISE") {
      onHandRaise(event.userName as string);
    }
  });
}
