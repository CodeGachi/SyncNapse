/**
 * 손들기 패널 (Liveblocks 실시간 버전)
 *
 * Liveblocks Storage를 사용하여 실시간 손들기 기능
 * - 학생이 손들기 버튼 클릭 → Storage에 추가
 * - Educator가 손들기 목록 확인 및 응답
 */

"use client";

import { useState, useEffect } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import { Hand, CheckCircle, Clock } from "lucide-react";

interface HandRaisePanelProps {
  userId: string;
  userName: string;
  isEducator?: boolean;
}

export function HandRaisePanel({
  userId,
  userName,
  isEducator = false,
}: HandRaisePanelProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Liveblocks Storage에서 손들기 목록 가져오기
  const handRaises = useStorage((root) => root.handRaises) || [];
  const broadcast = useBroadcastEvent();

  // 손들기 목록 변경 감지 (디버깅용)
  useEffect(() => {
    console.log(`[Hand Raise Panel] 손들기 목록 업데이트:`, {
      userId,
      userName,
      isEducator,
      totalHandRaises: handRaises.length,
      activeHandRaises: handRaises.filter((h) => h.isActive).length,
      handRaises: handRaises.filter((h) => h.isActive).map((h) => ({
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
    ({ storage }, userName: string, userId: string) => {
      console.log(`[Hand Raise Mutation] Storage 접근 시작`);
      const handRaises = storage.get("handRaises");
      console.log(`[Hand Raise Mutation] 현재 handRaises 배열:`, handRaises);
      console.log(`[Hand Raise Mutation] handRaises 타입:`, typeof handRaises, Array.isArray(handRaises));

      // 중복 방지: 이미 손들기 중이면 무시
      const existing = handRaises.find(
        (h) => h.userId === userId && h.isActive
      );
      if (existing) {
        console.log(`[Hand Raise Mutation] 이미 손들기 중: ${userId}`);
        return;
      }

      // 새 손들기 추가
      const newHandRaise = {
        id: `hand-${userId}-${Date.now()}`,
        userId,
        userName,
        timestamp: Date.now(),
        isActive: true,
      };

      console.log(`[Hand Raise Mutation] 새 손들기 생성:`, newHandRaise);
      handRaises.push(newHandRaise);
      console.log(`[Hand Raise Mutation] 손들기 추가 후 배열 길이:`, handRaises.length);
    },
    []
  );

  // 손들기 제거 Mutation (Student 본인 또는 Educator)
  const lowerHand = useMutation(({ storage }, handRaiseId: string) => {
    const handRaises = storage.get("handRaises");
    const index = handRaises.findIndex((h) => h.id === handRaiseId);

    if (index !== -1) {
      const handRaise = handRaises.get(index);
      if (!handRaise) return;
      // LiveList 중첩 객체 문제: 전체 객체를 새로 만들어 set()으로 교체
      handRaises.set(index, { ...handRaise, isActive: false });
    }
  }, []);

  // 모든 손들기 제거 Mutation (Educator만)
  const clearAllHandRaises = useMutation(({ storage }) => {
    const handRaises = storage.get("handRaises");
    // LiveList 중첩 객체 문제: 각 항목을 set()으로 교체
    for (let i = 0; i < handRaises.length; i++) {
      const handRaise = handRaises.get(i);
      if (!handRaise) continue;
      if (handRaise.isActive) {
        handRaises.set(i, { ...handRaise, isActive: false });
      }
    }
  }, []);

  // 손들기 버튼 클릭 (Student) - 한 번만 가능
  const handleRaiseHand = () => {
    if (!isHandRaised) {
      // 손들기
      console.log(`[Hand Raise Panel] 손들기 시작:`, { userId, userName });
      raiseHand(userName, userId);
      console.log(`[Hand Raise Panel] raiseHand Mutation 호출 완료`);
      broadcast({
        type: "HAND_RAISE",
        userId,
        userName,
      });
    }
  };

  // Educator: 특정 손들기 응답
  const handleRespond = (handRaiseId: string, studentName: string) => {
    lowerHand(handRaiseId);
    setToastMessage(`${studentName}님에게 응답했습니다`);
    setShowToast(true);
  };

  // 손들기 이벤트 리스너 (Educator에게 알림)
  useEventListener(({ event }) => {
    if (!isEducator) return;

    if (event.type === "HAND_RAISE") {
      setToastMessage(`${event.userName}님이 손을 들었습니다`);
      setShowToast(true);
    }
  });

  // 토스트 자동 숨김
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // 활성화된 손들기만 필터링 및 정렬 (오래된 순)
  const activeHandRaises = handRaises
    .filter((h) => h.isActive)
    .sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 토스트 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#AFC02B] text-black px-4 py-2 rounded-lg shadow-lg animate-slide-in-right">
          {toastMessage}
        </div>
      )}

      {/* Student 뷰: 손들기 버튼 */}
      {!isEducator && (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRaiseHand}
            disabled={isHandRaised}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all bg-[#AFC02B] text-black hover:bg-[#AFC02B]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Hand size={20} />
            <span>손들기</span>
          </button>

          {isHandRaised && (
            <div className="text-center text-white/60 text-sm flex items-center justify-center gap-2">
              <CheckCircle size={14} className="text-[#AFC02B]" />
              <span>손들기 완료! Educator가 확인 중입니다</span>
            </div>
          )}
        </div>
      )}

      {/* Educator 뷰: 손들기 목록 */}
      {isEducator && (
        <>
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-white/20 pb-3">
            <div className="flex items-center gap-2">
              <Hand size={16} className="text-[#AFC02B]" />
              <h4 className="text-white text-sm font-bold">
                손들기 ({activeHandRaises.length}명)
              </h4>
            </div>
            {activeHandRaises.length > 0 && (
              <button
                onClick={() => clearAllHandRaises()}
                className="px-2 py-1 text-xs text-white/60 hover:text-white transition-colors"
              >
                모두 지우기
              </button>
            )}
          </div>

          {/* 손들기 목록 */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {activeHandRaises.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm flex flex-col items-center gap-2">
                <Hand size={32} />
                <p>손든 학생이 없습니다</p>
                <p className="text-xs">학생이 손들기를 하면 여기에 표시됩니다</p>
              </div>
            ) : (
              activeHandRaises.map((handRaise, index) => (
                <div
                  key={handRaise.id}
                  className="bg-white/5 rounded-lg p-3 border border-white/10 hover:border-[#AFC02B]/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* 순서 */}
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#AFC02B]/20 text-[#AFC02B] flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>

                      {/* 사용자 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {handRaise.userName}
                        </p>
                        <p className="text-white/40 text-xs">
                          {new Date(handRaise.timestamp).toLocaleTimeString(
                            "ko-KR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }
                          )}
                        </p>
                      </div>

                      {/* 손 아이콘 */}
                      <Hand
                        size={20}
                        className="text-[#AFC02B] animate-wiggle flex-shrink-0"
                      />
                    </div>

                    {/* 응답 버튼 */}
                    <button
                      onClick={() =>
                        handleRespond(handRaise.id, handRaise.userName)
                      }
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#AFC02B] text-black rounded text-xs font-medium hover:bg-[#AFC02B]/90 transition-colors flex-shrink-0"
                    >
                      <CheckCircle size={14} />
                      <span>응답</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes wiggle {
          0%,
          100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(10deg);
          }
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
