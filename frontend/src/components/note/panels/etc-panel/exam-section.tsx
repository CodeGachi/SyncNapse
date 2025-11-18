/**
 * Exam Section 컴포넌트
 * Claude API를 사용하여 퀴즈 생성 및 채점
 */

"use client";

import { useState } from "react";
import { generateExam, type ExamQuestion } from "@/lib/ai/claude-client";

interface ExamSectionProps {
  noteContent: string;
}

export function ExamSection({ noteContent }: ExamSectionProps) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async () => {
    if (!noteContent || noteContent.trim().length === 0) {
      setError("퀴즈를 생성할 내용이 없습니다. PDF를 업로드하거나 노트를 작성해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");
    setQuestions([]);
    setUserAnswers([]);
    setShowResults(false);

    try {
      const result = await generateExam(noteContent, 5);
      setQuestions(result);
      setUserAnswers(new Array(result.length).fill(-1)); // -1은 미선택
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "퀴즈 생성 중 오류가 발생했습니다.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleSubmit = () => {
    // 모든 문제를 풀었는지 확인
    const unanswered = userAnswers.filter((a) => a === -1).length;
    if (unanswered > 0) {
      setError(`아직 답하지 않은 문제가 ${unanswered}개 있습니다.`);
      return;
    }

    setError("");
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setUserAnswers(new Array(questions.length).fill(-1));
    setError("");
  };

  // 점수 계산
  const score = questions.filter(
    (q, i) => userAnswers[i] === q.correctAnswer
  ).length;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 버튼 영역 */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-[#899649] text-white rounded-lg hover:bg-[#727d3d] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              생성 중...
            </span>
          ) : (
            "퀴즈 생성"
          )}
        </button>

        {showResults && (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            다시 풀기
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex-shrink-0">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 퀴즈 문제들 */}
      {questions.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {questions.map((question, qIndex) => (
              <div
                key={qIndex}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                {/* 문제 */}
                <div className="mb-3">
                  <span className="text-gray-400 text-xs">
                    문제 {qIndex + 1}/{questions.length}
                  </span>
                  <p className="text-white font-medium mt-1">
                    {question.question}
                  </p>
                </div>

                {/* 선택지 */}
                <div className="space-y-2">
                  {question.options.map((option, oIndex) => {
                    const isSelected = userAnswers[qIndex] === oIndex;
                    const isCorrect = oIndex === question.correctAnswer;
                    const showCorrect = showResults && isCorrect;
                    const showWrong = showResults && isSelected && !isCorrect;

                    return (
                      <label
                        key={oIndex}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          showCorrect
                            ? "bg-green-500/20 border border-green-500/50"
                            : showWrong
                            ? "bg-red-500/20 border border-red-500/50"
                            : isSelected
                            ? "bg-blue-500/20 border border-blue-500/50"
                            : "bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50"
                        } ${showResults ? "cursor-default" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          checked={isSelected}
                          onChange={() => handleAnswer(qIndex, oIndex)}
                          disabled={showResults}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span
                          className={`flex-1 text-sm ${
                            showCorrect
                              ? "text-green-300 font-medium"
                              : showWrong
                              ? "text-red-300"
                              : "text-gray-300"
                          }`}
                        >
                          {option}
                        </span>
                        {showCorrect && (
                          <span className="text-green-400 text-sm font-bold">
                            ✓
                          </span>
                        )}
                        {showWrong && (
                          <span className="text-red-400 text-sm font-bold">
                            ✗
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* 해설 (채점 후에만 표시) */}
                {showResults && question.explanation && (
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-300 text-xs">
                      💡 {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 채점 버튼 / 결과 */}
          <div className="mt-4 flex-shrink-0">
            {!showResults ? (
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                채점하기
              </button>
            ) : (
              <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg text-center">
                <p className="text-white text-lg font-bold mb-1">
                  점수: {score} / {questions.length}
                </p>
                <p className="text-gray-300 text-sm">
                  정답률: {((score / questions.length) * 100).toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 안내 메시지 (퀴즈가 없을 때) */}
      {questions.length === 0 && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 text-sm">
            <p className="mb-2">📝 퀴즈를 생성해보세요</p>
            <p className="text-xs text-gray-500">
              PDF와 노트 필기를 기반으로 5개의 객관식 문제를 생성합니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
