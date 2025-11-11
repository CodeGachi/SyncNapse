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

  // Liveblocks Storage에서 투표 목록 가져오기
  const polls = useStorage((root) => root.polls) || [];
  const activePoll = polls.find((p) => p.isActive);

  // 투표 목록 변경 감지 (디버깅용)
  useEffect(() => {
    console.log(`[Poll Panel] 투표 목록 업데이트:`, {
      userId,
      isEducator,
      pollCount: polls.length,
      activePoll: activePoll ? {
        id: activePoll.id,
        question: activePoll.question,
        optionCount: activePoll.options.length,
      } : null,
    });
  }, [polls, userId, isEducator, activePoll]);

  // 투표 생성 Mutation (Educator만)
  const createPoll = useMutation(
    ({ storage }, question: string, options: string[]) => {
      console.log(`[Poll Mutation] Storage 접근 시작`);
      const polls = storage.get("polls");
      console.log(`[Poll Mutation] 현재 polls 배열:`, polls);
      console.log(`[Poll Mutation] polls 타입:`, typeof polls, Array.isArray(polls));

      // 기존 활성 투표 비활성화
      polls.forEach((poll) => {
        poll.isActive = false;
      });

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

      console.log(`[Poll Mutation] 새 투표 생성:`, newPoll);
      polls.push(newPoll);
      console.log(`[Poll Mutation] 투표 추가 후 배열 길이:`, polls.length);
    },
    [userId]
  );

  // 투표 참여 Mutation
  const vote = useMutation(
    ({ storage }, pollId: string, optionIndex: number) => {
      const polls = storage.get("polls");
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) return;

      // 기존 투표 제거 (다른 옵션에 투표했을 수 있음)
      poll.options.forEach((option) => {
        const voteIndex = option.votes.indexOf(userId);
        if (voteIndex !== -1) {
          option.votes.splice(voteIndex, 1);
        }
      });

      // 새로운 투표 추가
      poll.options[optionIndex].votes.push(userId);
    },
    [userId]
  );

  // 투표 종료 Mutation (Educator만)
  const endPoll = useMutation(({ storage }, pollId: string) => {
    const polls = storage.get("polls");
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;
    poll.isActive = false;
  }, []);

  const handleCreatePoll = () => {
    const validOptions = options.filter((opt) => opt.trim());
    if (question.trim() && validOptions.length >= 2) {
      console.log(`[Poll Panel] 투표 생성 시작:`, {
        userId,
        isEducator,
        question,
        options: validOptions,
      });
      createPoll(question, validOptions);
      console.log(`[Poll Panel] 투표 생성 완료 (Mutation 실행됨)`);
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
      {/* 투표 생성 UI (Educator만) */}
      {isEducator && !activePoll && (
        <>
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#AFC02B] text-black rounded font-medium hover:bg-[#AFC02B]/90 transition-colors"
            >
              <Plus size={18} />
              <span>새 투표 만들기</span>
            </button>
          ) : (
            <div className="border border-white/20 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white text-sm font-bold">투표 생성</h4>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 질문 */}
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="투표 질문을 입력하세요..."
                className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#AFC02B]"
              />

              {/* 옵션 */}
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`옵션 ${index + 1}`}
                      className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#AFC02B]"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className="px-2 text-white/60 hover:text-red-400"
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
                className="w-full px-3 py-2 bg-white/5 text-white/60 rounded text-xs hover:bg-white/10 hover:text-white transition-colors"
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
                className="w-full px-4 py-2 bg-[#AFC02B] text-black rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#AFC02B]/90 transition-colors"
              >
                투표 시작
              </button>
            </div>
          )}
        </>
      )}

      {/* 활성 투표 */}
      {activePoll && (
        <div className="flex-1 flex flex-col gap-3">
          {/* 질문 */}
          <div className="border-b border-white/20 pb-3">
            <h3 className="text-white text-base font-bold">
              {activePoll.question}
            </h3>
            <p className="text-white/60 text-xs mt-1">
              {new Date(activePoll.createdAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* 옵션 */}
          <div className="flex-1 overflow-y-auto space-y-2">
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
                  onClick={() => vote(activePoll.id, index)}
                  disabled={!activePoll.isActive}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isVoted
                      ? "border-[#AFC02B] bg-[#AFC02B]/10"
                      : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
                  } ${!activePoll.isActive ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-white text-sm font-medium flex-1">
                      {option.text}
                    </span>
                    {isVoted && (
                      <CheckCircle2 size={16} className="text-[#AFC02B]" />
                    )}
                  </div>

                  {/* 진행 바 */}
                  <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                        isVoted ? "bg-[#AFC02B]" : "bg-white/30"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* 통계 */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-white/60 text-xs">
                      {option.votes.length}명 투표
                    </span>
                    <span className="text-white/60 text-xs font-bold">
                      {percentage}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Educator 전용: 투표 종료 버튼 */}
          {isEducator && activePoll.isActive && (
            <button
              onClick={() => endPoll(activePoll.id)}
              className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded font-medium hover:bg-red-500/30 transition-colors"
            >
              투표 종료
            </button>
          )}

          {/* 투표 종료 메시지 */}
          {!activePoll.isActive && (
            <div className="text-center py-2 text-white/60 text-sm bg-white/5 rounded">
              투표가 종료되었습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
