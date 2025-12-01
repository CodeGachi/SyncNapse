/**
 * 손들기 패널 (Liveblocks 실시간 버전)
 *
 * UI 컴포넌트 - 손들기 기능의 시각적 표현
 * 비즈니스 로직은 useHandRaise 훅에서 처리
 */

"use client";

import { useState, useEffect } from "react";
import { Hand, CheckCircle, Clock } from "lucide-react";
import {
  useHandRaise,
  useHandRaiseEventListener,
} from "@/features/note/collaboration/use-hand-raise";

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

  // 손들기 훅 사용
  const {
    activeHandRaises,
    isHandRaised,
    handleRaiseHand,
    handleRespond: respond,
    handleClearAll,
  } = useHandRaise({ userId, userName, isEducator });

  // Educator: 특정 손들기 응답
  const handleRespond = (handRaiseId: string, studentName: string) => {
    respond(handRaiseId);
    setToastMessage(`${studentName}님에게 응답했습니다`);
    setShowToast(true);
  };

  // 손들기 이벤트 리스너 (Educator에게 알림)
  useHandRaiseEventListener(isEducator, (studentName) => {
    setToastMessage(`${studentName}님이 손을 들었습니다`);
    setShowToast(true);
  });

  // 토스트 자동 숨김
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 토스트 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-brand text-black px-4 py-2 rounded-lg shadow-lg animate-slide-in-right">
          {toastMessage}
        </div>
      )}

      {/* Student 뷰: 손들기 버튼 */}
      {!isEducator && (
        <div className="flex flex-col gap-4 h-full justify-center px-4">
          <div className="text-center space-y-2 mb-4">
            <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hand size={40} className="text-brand" />
            </div>
            <h4 className="text-foreground text-lg font-bold">질문이나 의견이 있으신가요?</h4>
            <p className="text-foreground-secondary text-sm">
              손들기 버튼을 누르면<br />교육자에게 알림이 전송됩니다
            </p>
          </div>

          <button
            onClick={handleRaiseHand}
            disabled={isHandRaised}
            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${isHandRaised
                ? "bg-background-elevated text-foreground-tertiary cursor-not-allowed border border-border"
                : "bg-brand text-black hover:bg-brand-hover hover:scale-105 active:scale-95 shadow-brand/20"
              }`}
          >
            {isHandRaised ? (
              <>
                <CheckCircle size={24} className="text-brand" />
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
            <div className="bg-brand/10 border border-brand/20 rounded-lg p-3 text-center animate-fade-in">
              <p className="text-brand text-sm font-medium">
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
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand/10 rounded-lg">
                <Hand size={18} className="text-brand" />
              </div>
              <div>
                <h4 className="text-foreground text-sm font-bold">손들기 요청</h4>
                <p className="text-foreground-tertiary text-xs">
                  {activeHandRaises.length > 0
                    ? `${activeHandRaises.length}명의 학생이 기다리고 있습니다`
                    : "대기 중인 요청이 없습니다"}
                </p>
              </div>
            </div>
            {activeHandRaises.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground hover:bg-foreground/10 rounded-md transition-colors"
              >
                모두 지우기
              </button>
            )}
          </div>

          {/* 손들기 목록 */}
          <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1 custom-scrollbar">
            {activeHandRaises.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-foreground-tertiary gap-3">
                <div className="w-12 h-12 rounded-full bg-background-surface flex items-center justify-center">
                  <Hand size={20} className="opacity-20" />
                </div>
                <p className="text-sm">손든 학생이 없습니다</p>
              </div>
            ) : (
              activeHandRaises.map((handRaise, index) => (
                <div
                  key={handRaise.id}
                  className="bg-background-surface rounded-xl p-4 border border-transparent hover:border-brand/30 transition-all group shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* 순서 */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-bold ring-1 ring-brand/20">
                        {index + 1}
                      </div>

                      {/* 사용자 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-foreground text-sm font-bold truncate">
                            {handRaise.userName}
                          </p>
                          <Hand
                            size={14}
                            className="text-brand animate-wiggle flex-shrink-0"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-foreground-tertiary text-xs mt-0.5">
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
                      className="flex items-center gap-1.5 px-3 py-2 bg-brand text-black rounded-lg text-xs font-bold hover:bg-brand-hover transition-colors shadow-sm active:scale-95"
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
