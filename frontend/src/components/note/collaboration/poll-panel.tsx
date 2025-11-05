/**
 * 빠른 투표 패널
 * 강사가 투표를 만들고 학생들이 실시간으로 투표하는 인터페이스
 */

"use client";

import { useCollaborationStore } from "@/stores/collaboration-store";
import { useCallback, useState } from "react";

interface PollPanelProps {
  userId: string;
  noteId: string;
  isEducator?: boolean;
}

export function PollPanel({
  userId,
  noteId,
  isEducator = false,
}: PollPanelProps) {
  const {
    currentPoll,
    createPoll,
    votePoll,
    closePoll,
    isPollCreating,
    setPollCreating,
  } = useCollaborationStore();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const hasVoted = currentPoll
    ? currentPoll.options.some((opt) => opt.voters.includes(userId))
    : false;

  const handleAddOption = useCallback(() => {
    setOptions([...options, ""]);
  }, [options]);

  const handleOptionChange = useCallback(
    (index: number, value: string) => {
      const newOptions = [...options];
      newOptions[index] = value;
      setOptions(newOptions);
    },
    [options]
  );

  const handleCreatePoll = useCallback(() => {
    if (question.trim() && options.every((opt) => opt.trim())) {
      createPoll(noteId, question, options, userId);
      setQuestion("");
      setOptions(["", ""]);
      setPollCreating(false);
    }
  }, [question, options, noteId, userId, createPoll, setPollCreating]);

  const handleVote = useCallback(
    (optionId: string) => {
      if (!hasVoted) {
        votePoll(userId, optionId);
      }
    },
    [userId, votePoll, hasVoted]
  );

  // 투표 생성 폼
  if (isPollCreating && isEducator) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-white/60 font-medium">질문</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="투표 질문을 입력하세요"
            className="w-full mt-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#AFC02B]"
          />
        </div>

        <div>
          <label className="text-xs text-white/60 font-medium">선택지</label>
          <div className="space-y-2 mt-1">
            {options.map((opt, index) => (
              <input
                key={index}
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`선택지 ${index + 1}`}
                className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[#AFC02B]"
              />
            ))}
          </div>

          {options.length < 5 && (
            <button
              onClick={handleAddOption}
              className="mt-2 text-xs text-[#AFC02B] hover:text-[#AFC02B]/80 font-medium"
            >
              + 선택지 추가
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreatePoll}
            disabled={!question.trim() || !options.every((opt) => opt.trim())}
            className="flex-1 py-2 px-3 bg-[#AFC02B] text-black rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#AFC02B]/90 transition-colors"
          >
            투표 시작
          </button>
          <button
            onClick={() => setPollCreating(false)}
            className="flex-1 py-2 px-3 bg-white/10 text-white rounded font-medium hover:bg-white/20 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  // 진행 중인 투표 표시
  if (currentPoll && currentPoll.isActive) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div>
          <h3 className="text-white font-medium">{currentPoll.question}</h3>
          <div className="text-xs text-white/60 mt-1">
            {currentPoll.results.totalVotes}명 투표
            {hasVoted && " • 이미 투표함"}
          </div>
        </div>

        <div className="space-y-3 flex-1">
          {currentPoll.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{option.text}</span>
                <span className="text-xs text-white/60">
                  {option.votes}명 ({(currentPoll.results.percentages[option.id] || 0).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-6 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#AFC02B] to-[#AFC02B]/70 transition-all duration-300"
                  style={{
                    width: `${currentPoll.results.percentages[option.id] || 0}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* 강사용 투표 종료 버튼 */}
        {isEducator && (
          <button
            onClick={closePoll}
            className="w-full py-2 px-3 bg-white/10 text-white rounded text-sm font-medium hover:bg-white/20 transition-colors"
          >
            투표 종료
          </button>
        )}
      </div>
    );
  }

  // 투표가 없을 때
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      <div className="text-white/40 text-sm mb-4">진행 중인 투표가 없습니다</div>
      {isEducator && (
        <button
          onClick={() => setPollCreating(true)}
          className="py-2 px-4 bg-[#AFC02B] text-black rounded font-medium hover:bg-[#AFC02B]/90 transition-colors"
        >
          + 투표 만들기
        </button>
      )}
    </div>
  );
}
