/**
 * 투표 패널 (Liveblocks 실시간 버전)
 *
 * UI 컴포넌트 - 투표 기능의 시각적 표현
 * 비즈니스 로직은 usePoll 훅에서 처리
 */

"use client";

import { useState, useEffect } from "react";
import { BarChart3, Plus, X, CheckCircle2 } from "lucide-react";
import { usePoll, usePollEventListener } from "@/features/note/collaboration/use-poll";

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

  // 투표 훅 사용
  const { activePoll, handleCreatePoll, handleVote, handleEndPoll } = usePoll({
    userId,
    isEducator,
  });

  // 투표 이벤트 리스너
  usePollEventListener(isEducator, {
    onPollCreated: (pollQuestion) => {
      setToastMessage(`새 투표가 시작되었습니다: ${pollQuestion}`);
      setShowToast(true);
    },
    onPollEnded: () => {
      setToastMessage("투표가 종료되었습니다");
      setShowToast(true);
    },
  });

  // 토스트 자동 숨김
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const onCreatePoll = () => {
    const validOptions = options.filter((opt) => opt.trim());
    if (question.trim() && validOptions.length >= 2) {
      handleCreatePoll(question, validOptions);
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
      <div className="text-center py-8 text-foreground/40 text-sm flex flex-col items-center gap-2">
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
        <div className="fixed top-4 right-4 z-50 bg-brand text-black px-4 py-2 rounded-lg shadow-lg animate-slide-in-right">
          {toastMessage}
        </div>
      )}

      {/* 투표 생성 UI (Educator만) */}
      {isEducator && !activePoll && (
        <>
          {!isCreating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 size={32} className="text-brand" />
                </div>
                <h4 className="text-foreground text-lg font-bold">새로운 투표 만들기</h4>
                <p className="text-foreground-secondary text-sm">
                  실시간 투표를 통해<br />학생들의 의견을 수집해보세요
                </p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-background-elevated text-brand border border-brand/30 rounded-xl font-bold hover:bg-brand hover:text-black transition-all shadow-lg hover:scale-105 active:scale-95"
              >
                <Plus size={20} />
                <span>투표 생성하기</span>
              </button>
            </div>
          ) : (
            <div className="bg-background-surface border border-border rounded-xl p-4 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-foreground text-sm font-bold flex items-center gap-2">
                  <BarChart3 size={16} className="text-brand" />
                  투표 생성
                </h4>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-foreground-tertiary hover:text-foreground transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 질문 */}
              <div className="space-y-1.5">
                <label className="text-xs text-foreground-secondary font-medium ml-1">질문</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="투표 질문을 입력하세요..."
                  className="w-full bg-background-base border border-border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-foreground-tertiary focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {/* 옵션 */}
              <div className="space-y-2">
                <label className="text-xs text-foreground-secondary font-medium ml-1">옵션</label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`옵션 ${index + 1}`}
                      className="flex-1 bg-background-base border border-border rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-foreground-tertiary focus:outline-none focus:border-brand transition-colors"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(index)}
                        className="px-2 text-foreground-tertiary hover:text-status-error transition-colors"
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
                className="w-full px-3 py-2.5 bg-background-elevated text-foreground-secondary rounded-lg text-xs font-medium hover:bg-background-overlay hover:text-foreground transition-colors border border-dashed border-border-strong"
              >
                + 옵션 추가
              </button>

              {/* 생성 버튼 */}
              <button
                onClick={onCreatePoll}
                disabled={
                  !question.trim() ||
                  options.filter((opt) => opt.trim()).length < 2
                }
                className="w-full px-4 py-3 bg-background-elevated text-brand border border-brand/30 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand hover:text-black transition-all shadow-md mt-2"
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
          <div className="bg-background-surface border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-brand/20 text-brand mb-2">
                  진행 중
                </span>
                <h3 className="text-foreground text-lg font-bold leading-tight">
                  {activePoll.question}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-foreground-tertiary text-[10px] font-mono">
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
                    ? "border-brand bg-brand/5 shadow-[0_0_15px_rgba(175,192,43,0.1)]"
                    : "border-border bg-background-surface hover:border-border-strong hover:bg-background-elevated"
                    } ${!activePoll.isActive ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {/* 배경 진행 바 */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${isVoted ? "bg-brand/10" : "bg-foreground/5"
                      }`}
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={`text-sm font-bold flex-1 ${isVoted ? "text-brand" : "text-foreground"}`}>
                        {option.text}
                      </span>
                      {isVoted && (
                        <div className="bg-brand text-black rounded-full p-0.5">
                          <CheckCircle2 size={14} />
                        </div>
                      )}
                    </div>

                    {/* 통계 */}
                    <div className="flex items-end justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-background-base rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isVoted ? "bg-brand" : "bg-foreground-tertiary"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-foreground-tertiary text-xs font-medium">
                          {option.votes.length}명
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${isVoted ? "text-brand" : "text-foreground"}`}>
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
              className="w-full px-4 py-3 bg-background-surface border border-status-error/30 text-status-error rounded-xl font-bold hover:bg-status-error/10 hover:border-status-error/50 transition-all shadow-sm"
            >
              투표 종료하기
            </button>
          )}

          {/* 투표 종료 메시지 */}
          {!activePoll.isActive && (
            <div className="text-center py-3 text-foreground-tertiary text-sm bg-background-surface rounded-xl border border-border">
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
