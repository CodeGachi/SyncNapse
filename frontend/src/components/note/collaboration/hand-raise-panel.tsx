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
    /* console.log(`[Hand Raise Panel] 손들기 목록 업데이트:`, {
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
    }); */
  }, [handRaises, userId, userName, isEducator]);

  // 현재 사용자가 손들기 중인지 확인
  const myHandRaise = handRaises.find(
    (h) => h.userId === userId && h.isActive
  );
  const isHandRaised = !!myHandRaise;

  // 손들기 추가 Mutation (Student)
  const raiseHand = useMutation(
    ({ storage }, userName: string, userId: string) => {
      // console.log(`[Hand Raise Mutation] Storage 접근 시작`);
      const handRaises = storage.get("handRaises");
      // console.log(`[Hand Raise Mutation] 현재 handRaises 배열:`, handRaises);
      // console.log(`[Hand Raise Mutation] handRaises 타입:`, typeof handRaises, Array.isArray(handRaises));

      // 중복 방지: 이미 손들기 중이면 무시
      const existing = handRaises.find(
        (h) => h.userId === userId && h.isActive
      );
      if (existing) {
        // console.log(`[Hand Raise Mutation] 이미 손들기 중: ${userId}`);
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

      // console.log(`[Hand Raise Mutation] 새 손들기 생성:`, newHandRaise);
      handRaises.push(newHandRaise);
      // console.log(`[Hand Raise Mutation] 손들기 추가 후 배열 길이:`, handRaises.length);
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
      // console.log(`[Hand Raise Panel] 손들기 시작:`, { userId, userName });
      raiseHand(userName, userId);
      // console.log(`[Hand Raise Panel] raiseHand Mutation 호출 완료`);
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
        <div className="flex flex-col gap-4 h-full justify-center px-4">
          <div className="text-center space-y-2 mb-4">
            <div className="w-20 h-20 bg-[#AFC02B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hand size={40} className="text-[#AFC02B]" />
            </div>
            <h4 className="text-white text-lg font-bold">질문이나 의견이 있으신가요?</h4>
            <p className="text-gray-400 text-sm">
              손들기 버튼을 누르면<br />교육자에게 알림이 전송됩니다
            </p>
          </div>

          <button
            onClick={handleRaiseHand}
            disabled={isHandRaised}
            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${isHandRaised
                ? "bg-[#2f2f2f] text-gray-500 cursor-not-allowed border border-[#3c3c3c]"
                : "bg-[#AFC02B] text-black hover:bg-[#c2d43b] hover:scale-105 active:scale-95 shadow-[#AFC02B]/20"
              }`}
          >
            {isHandRaised ? (
              <>
                <CheckCircle size={24} className="text-[#AFC02B]" />
                <span>손들기 완료</span>
              </>
            ) : (
              <>
                <Hand size={24} />
                <span>손들기</span>
              </>
            )}
          </button>

          {isHandRaised && (
            <div className="bg-[#AFC02B]/10 border border-[#AFC02B]/20 rounded-lg p-3 text-center animate-fade-in">
              <p className="text-[#AFC02B] text-sm font-medium">
                교육자가 확인 중입니다. 잠시만 기다려주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Educator 뷰: 손들기 목록 */}
      {isEducator && (
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between pb-4 border-b border-[#3c3c3c]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#AFC02B]/10 rounded-lg">
                <Hand size={18} className="text-[#AFC02B]" />
              </div>
              <div>
                <h4 className="text-white text-sm font-bold">손들기 요청</h4>
                <p className="text-gray-500 text-xs">
                  {activeHandRaises.length > 0
                    ? `${activeHandRaises.length}명의 학생이 기다리고 있습니다`
                    : "대기 중인 요청이 없습니다"}
                </p>
              </div>
            </div>
            {activeHandRaises.length > 0 && (
              <button
                onClick={() => clearAllHandRaises()}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                모두 지우기
              </button>
            )}
          </div>

          {/* 손들기 목록 */}
          <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1 custom-scrollbar">
            {activeHandRaises.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#252525] flex items-center justify-center">
                  <Hand size={20} className="opacity-20" />
                </div>
                <p className="text-sm">손든 학생이 없습니다</p>
              </div>
            ) : (
              activeHandRaises.map((handRaise, index) => (
                <div
                  key={handRaise.id}
                  className="bg-[#252525] rounded-xl p-4 border border-transparent hover:border-[#AFC02B]/30 transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* 순서 */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#AFC02B]/10 text-[#AFC02B] flex items-center justify-center text-sm font-bold ring-1 ring-[#AFC02B]/20">
                        {index + 1}
                      </div>

                      {/* 사용자 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-bold truncate">
                            {handRaise.userName}
                          </p>
                          <Hand
                            size={14}
                            className="text-[#AFC02B] animate-wiggle flex-shrink-0"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-0.5">
                          <Clock size={10} />
                          <span>
                            {new Date(handRaise.timestamp).toLocaleTimeString(
                              "ko-KR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 응답 버튼 */}
                    <button
                      onClick={() =>
                        handleRespond(handRaise.id, handRaise.userName)
                      }
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#AFC02B] text-black rounded-lg text-xs font-bold hover:bg-[#c2d43b] transition-colors shadow-sm active:scale-95"
                    >
                      <CheckCircle size={14} />
                      <span>응답하기</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
