/**
 * 투표 패널 (Liveblocks 실시간 버전)
 *
 * Liveblocks Storage를 사용하여 실시간 투표 기능
 * - Educator만 투표 생성 가능
 * - 모든 참여자가 투표 참여 가능
 * - 실시간 결과 확인
 */

"use client";

import { useState, useEffect } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useEventListener,
} from "@/lib/liveblocks/liveblocks.config";
import { BarChart3, Plus, X, CheckCircle2 } from "lucide-react";

interface PollPanelProps {
  userId: string;
  noteId: string;
  isEducator?: boolean;
}

export function PollPanel({
  userId,
  isEducator = false,
}: PollPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Liveblocks Storage에서 투표 목록 가져오기
  const polls = useStorage((root) => root.polls) || [];
  const activePoll = polls.find((p) => p.isActive);

  // Broadcast 이벤트
  const broadcast = useBroadcastEvent();

  // 투표 목록 변경 감지 (디버깅용)
  useEffect(() => {
    /* console.log(`[Poll Panel] 투표 목록 업데이트:`, {
      userId,
      isEducator,
      pollCount: polls.length,
      activePoll: activePoll ? {
        id: activePoll.id,
        question: activePoll.question,
        optionCount: activePoll.options.length,
      } : null,
    }); */
  }, [polls, userId, isEducator, activePoll]);

  // 투표 이벤트 리스너 (Student에게 알림)
  useEventListener(({ event }) => {
    if (event.type === "POLL_CREATED") {
      // console.log(`[Poll Panel] 새 투표 생성됨:`, event.question);
      if (!isEducator) {
        setToastMessage(`새 투표가 시작되었습니다: ${event.question}`);
        setShowToast(true);
      }
    } else if (event.type === "POLL_ENDED") {
      // console.log(`[Poll Panel] 투표 종료됨:`, event.pollId);
      setToastMessage("투표가 종료되었습니다");
      setShowToast(true);
    } else if (event.type === "POLL_VOTE") {
      // console.log(`[Poll Panel] 투표 참여:`, event);
      // Educator만 투표 알림 받기
      if (isEducator) {
        // 조용히 로그만 (너무 많은 알림 방지)
      }
    }
  });

  // 토스트 자동 숨김
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // 투표 생성 Mutation (Educator만)
  const createPoll = useMutation(
    ({ storage }, question: string, options: string[]) => {
      // console.log(`[Poll Mutation] Storage 접근 시작`);
      const polls = storage.get("polls");
      // console.log(`[Poll Mutation] 현재 polls 배열:`, polls);
      // console.log(`[Poll Mutation] polls 타입:`, typeof polls, Array.isArray(polls));

      // 기존 활성 투표 비활성화 (LiveList 중첩 객체 문제 해결)
      for (let i = 0; i < polls.length; i++) {
        const poll = polls.get(i);
        if (!poll) continue;
        if (poll.isActive) {
          polls.set(i, { ...poll, isActive: false });
        }
      }

      // 새 투표 생성
      const newPoll = {
        id: `poll-${Date.now()}`,
        question,
        options: options.map((opt) => ({
          text: opt,
          votes: [],
        })),
        createdBy: userId,
        createdAt: Date.now(),
        isActive: true,
      };

      // console.log(`[Poll Mutation] 새 투표 생성:`, newPoll);
      polls.push(newPoll);
      // console.log(`[Poll Mutation] 투표 추가 후 배열 길이:`, polls.length);
    },
    [userId]
  );

  // 투표 참여 Mutation
  const vote = useMutation(
    ({ storage }, pollId: string, optionIndex: number) => {
      const polls = storage.get("polls");
      const pollIndex = polls.findIndex((p) => p.id === pollId);
      if (pollIndex === -1) return;

      const poll = polls.get(pollIndex);
      if (!poll) return;
      // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
      polls.set(pollIndex, {
        ...poll,
        options: poll.options.map((option, idx) => ({
          ...option,
          votes:
            idx === optionIndex
              ? // 선택한 옵션: 기존 투표 제거 후 추가
              option.votes.includes(userId)
                ? option.votes // 이미 투표했으면 그대로
                : [...option.votes, userId]
              : // 다른 옵션: 기존 투표 제거
              option.votes.filter((id) => id !== userId),
        })),
      });
    },
    [userId]
  );

  // 투표 종료 Mutation (Educator만)
  const endPoll = useMutation(({ storage }, pollId: string) => {
    const polls = storage.get("polls");
    const pollIndex = polls.findIndex((p) => p.id === pollId);
    if (pollIndex === -1) return;

    const poll = polls.get(pollIndex);
    if (!poll) return;
    // LiveList 중첩 배열 문제: 전체 객체를 새로 만들어 set()으로 교체
    polls.set(pollIndex, {
      ...poll,
      isActive: false,
    });
  }, []);

  const handleCreatePoll = () => {
    const validOptions = options.filter((opt) => opt.trim());
    if (question.trim() && validOptions.length >= 2) {
      /* console.log(`[Poll Panel] 투표 생성 시작:`, {
        userId,
        isEducator,
        question,
        options: validOptions,
      }); */

      const pollId = `poll-${Date.now()}`;

      // 1. Storage에 저장
      createPoll(question, validOptions);
      // console.log(`[Poll Panel] 투표 생성 완료 (Mutation 실행됨)`);

      // 2. Broadcast로 즉시 알림
      broadcast({
        type: "POLL_CREATED",
        pollId,
        question,
      });
      // console.log(`[Poll Panel] 투표 생성 Broadcast 전송 완료`);

      setQuestion("");
      setOptions(["", ""]);
      setIsCreating(false);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  // 투표 참여 (Storage + Broadcast)
  const handleVote = (pollId: string, optionIndex: number) => {
    // console.log(`[Poll Panel] 투표 참여:`, { pollId, optionIndex, userId });

    // 1. Storage에 저장
    vote(pollId, optionIndex);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "POLL_VOTE",
      pollId,
      optionIndex,
      userId,
    });
    // console.log(`[Poll Panel] 투표 Broadcast 전송 완료`);
  };

  // 투표 종료 (Storage + Broadcast)
  const handleEndPoll = (pollId: string) => {
    // console.log(`[Poll Panel] 투표 종료:`, { pollId });

    // 1. Storage에 저장
    endPoll(pollId);

    // 2. Broadcast로 즉시 알림
    broadcast({
      type: "POLL_ENDED",
      pollId,
    });
    // console.log(`[Poll Panel] 투표 종료 Broadcast 전송 완료`);
  };

  // Educator만 투표 생성 가능
  if (!isEducator && !activePoll) {
    return (
      <div className="text-center py-8 text-white/40 text-sm flex flex-col items-center gap-2">
        <BarChart3 size={32} />
        <p>진행 중인 투표가 없습니다</p>
        <p className="text-xs">Educator가 투표를 생성할 때까지 대기하세요</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 토스트 알림 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#AFC02B] text-black px-4 py-2 rounded-lg shadow-lg animate-slide-in-right">
          {toastMessage}
        </div>
      )}

      {/* 투표 생성 UI (Educator만) */}
      {isEducator && !activePoll && (
        <>
          {!isCreating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-[#AFC02B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 size={32} className="text-[#AFC02B]" />
                </div>
                <h4 className="text-white text-lg font-bold">새로운 투표 만들기</h4>
                <p className="text-gray-400 text-sm">
                  실시간 투표를 통해<br />학생들의 의견을 수집해보세요
                </p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#333] text-[#AFC02B] border border-[#AFC02B]/30 rounded-xl font-bold hover:bg-[#AFC02B] hover:text-black transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                <Plus size={20} />
                <span>투표 생성하기</span>
              </button>
            </div>
          ) : (
            <div className="bg-[#252525] border border-[#3c3c3c] rounded-xl p-4 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#3c3c3c] pb-3">
                <h4 className="text-white text-sm font-bold flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#AFC02B]" />
                  투표 생성
                </h4>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 질문 */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium ml-1">질문</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="투표 질문을 입력하세요..."
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#AFC02B] transition-colors"
                />
              </div>

              {/* 옵션 */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium ml-1">옵션</label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`옵션 ${index + 1}`}
                      className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#AFC02B] transition-colors"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className="px-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* 옵션 추가 */}
              <button
                onClick={handleAddOption}
                className="w-full px-3 py-2.5 bg-[#333] text-gray-400 rounded-lg text-xs font-medium hover:bg-[#444] hover:text-white transition-colors border border-dashed border-[#444]"
              >
                + 옵션 추가
              </button>

              {/* 생성 버튼 */}
              <button
                onClick={handleCreatePoll}
                disabled={
                  !question.trim() ||
                  options.filter((opt) => opt.trim()).length < 2
                }
                className="w-full px-4 py-3 bg-[#333] text-[#AFC02B] border border-[#AFC02B]/30 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#AFC02B] hover:text-black transition-all shadow-md mt-2"
              >
                투표 시작
              </button>
            </div>
          )}
        </>
      )}

      {/* 활성 투표 */}
      {activePoll && (
        <div className="flex-1 flex flex-col gap-4 h-full">
          {/* 질문 */}
          <div className="bg-[#252525] border border-[#3c3c3c] rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#AFC02B]/20 text-[#AFC02B] mb-2">
                  진행 중
                </span>
                <h3 className="text-white text-lg font-bold leading-tight">
                  {activePoll.question}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-[10px] font-mono">
                  {new Date(activePoll.createdAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* 옵션 */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {activePoll.options.map((option, index) => {
              const totalVotes = activePoll.options.reduce(
                (sum, opt) => sum + opt.votes.length,
                0
              );
              const percentage =
                totalVotes > 0
                  ? Math.round((option.votes.length / totalVotes) * 100)
                  : 0;
              const isVoted = option.votes.includes(userId);

              return (
                <button
                  key={index}
                  onClick={() => handleVote(activePoll.id, index)}
                  disabled={!activePoll.isActive}
                  className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${isVoted
                    ? "border-[#AFC02B] bg-[#AFC02B]/5 shadow-[0_0_15px_rgba(175,192,43,0.1)]"
                    : "border-[#3c3c3c] bg-[#252525] hover:border-[#555] hover:bg-[#2a2a2a]"
                    } ${!activePoll.isActive ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {/* 배경 진행 바 */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${isVoted ? "bg-[#AFC02B]/10" : "bg-white/5"
                      }`}
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`text-sm font-bold flex-1 ${isVoted ? "text-[#AFC02B]" : "text-white"}`}>
                        {option.text}
                      </span>
                      {isVoted && (
                        <div className="bg-[#AFC02B] text-black rounded-full p-0.5">
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                    </div>

                    {/* 통계 */}
                    <div className="flex items-end justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-[#1e1e1e] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isVoted ? "bg-[#AFC02B]" : "bg-gray-500"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-gray-500 text-xs font-medium">
                          {option.votes.length}명
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isVoted ? "text-[#AFC02B]" : "text-white"}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Educator 전용: 투표 종료 버튼 */}
          {isEducator && activePoll.isActive && (
            <button
              onClick={() => handleEndPoll(activePoll.id)}
              className="w-full px-4 py-3 bg-[#252525] border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500/10 hover:border-red-500/50 transition-all shadow-sm"
            >
              투표 종료하기
            </button>
          )}

          {/* 투표 종료 메시지 */}
          {!activePoll.isActive && (
            <div className="text-center py-3 text-gray-500 text-sm bg-[#252525] rounded-xl border border-[#3c3c3c]">
              투표가 종료되었습니다
            </div>
          )}
        </div>
      )}

      <style jsx>{`
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

        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
