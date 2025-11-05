/**
 * 손들기 UI 패널
 * 학생들이 손을 들고 강사가 확인할 수 있는 인터페이스
 */

"use client";

import { useCollaborationStore } from "@/stores/collaboration-store";
import { useCallback } from "react";

interface HandRaisePanelProps {
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
}

export function HandRaisePanel({
  userId,
  userName,
  noteId,
  isEducator = false,
}: HandRaisePanelProps) {
  const {
    handRaises,
    addHandRaise,
    removeHandRaise,
    clearHandRaises,
  } = useCollaborationStore();

  const myHandRaise = handRaises.find((h) => h.userId === userId);

  const handleToggleHand = useCallback(() => {
    if (myHandRaise) {
      removeHandRaise(userId);
    } else {
      addHandRaise(userId, userName, noteId);
    }
  }, [myHandRaise, userId, userName, noteId, addHandRaise, removeHandRaise]);

  const handleDismiss = useCallback(
    (dismissUserId: string) => {
      if (isEducator) {
        removeHandRaise(dismissUserId);
      }
    },
    [isEducator, removeHandRaise]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 손들기 버튼 (학생용) */}
      {!isEducator && (
        <button
          onClick={handleToggleHand}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
            myHandRaise
              ? "bg-[#AFC02B] text-black shadow-lg"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {myHandRaise ? "👋 손 내리기" : "✋ 손 들기"}
        </button>
      )}

      {/* 손 들은 학생 목록 */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-xs text-white/60 px-2 py-1 font-medium">
          손 들은 학생 ({handRaises.length})
        </div>

        {handRaises.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            손 든 학생이 없습니다
          </div>
        ) : (
          <div className="space-y-2 px-2">
            {handRaises.map((hand) => (
              <div
                key={hand.id}
                className="bg-white/10 rounded-lg p-3 flex items-center justify-between hover:bg-white/15 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl">✋</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {hand.userName}
                    </div>
                    <div className="text-white/40 text-xs">
                      {formatTime(Date.now() - hand.timestamp)}
                    </div>
                  </div>
                </div>

                {/* 강사용 체크/해제 버튼 */}
                {isEducator && (
                  <button
                    onClick={() => handleDismiss(hand.userId)}
                    className="ml-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    ✓
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 강사용 전체 초기화 버튼 */}
      {isEducator && handRaises.length > 0 && (
        <button
          onClick={clearHandRaises}
          className="w-full py-2 px-3 bg-white/10 text-white/60 hover:bg-white/15 rounded text-xs transition-colors"
        >
          모두 초기화
        </button>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초 전`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
}
