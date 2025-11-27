/**
 * Exam (퀴즈) 컨텐츠
 */

"use client";

import { useState } from "react";
import { generateQuiz, type QuizQuestion } from "@/lib/api/ai.api";

interface ExamContentProps {
  noteId: string;
  onBack: () => void;
}

export function ExamContent({ noteId, onBack }: ExamContentProps) {
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState(5);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async () => {
    if (!noteId) {
      setError("노트 ID가 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setQuizzes([]);
    setSelectedAnswers({});
    setShowResults(false);

    try {
      const response = await generateQuiz({
        note_id: noteId,
        count: quizCount,
        use_pdf: true,
      });

      setQuizzes(response.quizzes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "퀴즈 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (quizIndex: number, optionIndex: number) => {
    if (showResults) return; // 결과 확인 후에는 답변 변경 불가
    setSelectedAnswers({
      ...selectedAnswers,
      [quizIndex]: optionIndex,
    });
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    quizzes.forEach((quiz, index) => {
      if (selectedAnswers[index] === quiz.correct_answer) {
        correct++;
      }
    });
    return { correct, total: quizzes.length };
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h4 className="text-white font-semibold">Exam</h4>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5L15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* 퀴즈 생성 설정 */}
        {quizzes.length === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                문제 개수 (1~10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={quizCount}
                onChange={(e) => setQuizCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#2a2a2a] text-white rounded border border-gray-600 focus:border-[#899649] focus:outline-none"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full px-4 py-2 bg-[#899649] text-white rounded hover:bg-[#7A8740] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "퀴즈 생성 중..." : "퀴즈 생성"}
            </button>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-500 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* 퀴즈 목록 */}
        {quizzes.length > 0 && (
          <div className="space-y-6">
            {quizzes.map((quiz, quizIndex) => {
              const isCorrect =
                showResults && selectedAnswers[quizIndex] === quiz.correct_answer;
              const isWrong =
                showResults &&
                selectedAnswers[quizIndex] !== undefined &&
                selectedAnswers[quizIndex] !== quiz.correct_answer;

              return (
                <div
                  key={quizIndex}
                  className="p-4 bg-[#2a2a2a] rounded-lg space-y-3"
                >
                  {/* 문제 */}
                  <div className="flex gap-2">
                    <span className="text-[#899649] font-semibold">
                      Q{quizIndex + 1}.
                    </span>
                    <p className="text-white">{quiz.question}</p>
                  </div>

                  {/* 선택지 */}
                  <div className="space-y-2 pl-6">
                    {quiz.options.map((option, optionIndex) => {
                      const isSelected = selectedAnswers[quizIndex] === optionIndex;
                      const isCorrectOption = optionIndex === quiz.correct_answer;

                      let bgColor = "bg-[#1e1e1e]";
                      let borderColor = "border-gray-600";
                      let textColor = "text-gray-300";

                      if (showResults) {
                        if (isCorrectOption) {
                          bgColor = "bg-green-900/30";
                          borderColor = "border-green-500";
                          textColor = "text-green-300";
                        } else if (isSelected) {
                          bgColor = "bg-red-900/30";
                          borderColor = "border-red-500";
                          textColor = "text-red-300";
                        }
                      } else if (isSelected) {
                        bgColor = "bg-[#899649]/20";
                        borderColor = "border-[#899649]";
                        textColor = "text-white";
                      }

                      return (
                        <button
                          key={optionIndex}
                          onClick={() => handleAnswerSelect(quizIndex, optionIndex)}
                          disabled={showResults}
                          className={`w-full p-3 rounded border text-left transition-all ${bgColor} ${borderColor} ${textColor} hover:border-[#899649] disabled:cursor-default`}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optionIndex)}.
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {/* 해설 (답안 제출 후) */}
                  {showResults && (
                    <div className="pl-6 pt-2 border-t border-gray-600">
                      <p className="text-sm text-gray-400 mb-1">해설:</p>
                      <p className="text-sm text-gray-300">{quiz.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 제출/재시작 버튼 */}
            <div className="space-y-2">
              {!showResults ? (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(selectedAnswers).length !== quizzes.length}
                  className="w-full px-4 py-2 bg-[#899649] text-white rounded hover:bg-[#7A8740] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  답안 제출
                </button>
              ) : (
                <>
                  <div className="p-4 bg-[#899649]/20 border border-[#899649] rounded text-center">
                    <p className="text-white text-lg font-semibold">
                      점수: {calculateScore().correct} / {calculateScore().total}
                    </p>
                    <p className="text-gray-300 text-sm mt-1">
                      정답률:{" "}
                      {Math.round(
                        (calculateScore().correct / calculateScore().total) * 100
                      )}
                      %
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setQuizzes([]);
                      setSelectedAnswers({});
                      setShowResults(false);
                    }}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    새 퀴즈 생성
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


