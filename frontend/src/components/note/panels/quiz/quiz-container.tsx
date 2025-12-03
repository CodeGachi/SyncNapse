/**
 * 퀴즈 컨테이너 컴포넌트
 * 퀴즈 전체 흐름을 관리 (문제 진행, 점수 표시, 결과)
 */

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, RotateCcw, Trophy, Target, CheckCircle2 } from "lucide-react";
import { QuizQuestionCard } from "./quiz-question-card";
import type { QuizQuestion } from "@/lib/api/services/ai.api";

interface QuizContainerProps {
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
  onReset?: () => void;
}

interface QuestionState {
  isAnswered: boolean;
  isCorrect: boolean;
  selectedIndex: number | null;
}

export function QuizContainer({ questions, onComplete, onReset }: QuizContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<QuestionState[]>(
    questions.map(() => ({ isAnswered: false, isCorrect: false, selectedIndex: null }))
  );
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentState = questionStates[currentIndex];
  const correctCount = questionStates.filter((s) => s.isCorrect).length;
  const answeredCount = questionStates.filter((s) => s.isAnswered).length;

  const handleAnswer = useCallback((isCorrect: boolean) => {
    setQuestionStates((prev) => {
      const newStates = [...prev];
      newStates[currentIndex] = {
        isAnswered: true,
        isCorrect,
        selectedIndex: newStates[currentIndex].selectedIndex,
      };
      return newStates;
    });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsCompleted(true);
      onComplete?.(correctCount, questions.length);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setQuestionStates(questions.map(() => ({ isAnswered: false, isCorrect: false, selectedIndex: null })));
    setIsCompleted(false);
    onReset?.();
  };

  const getScoreColor = () => {
    const percentage = (correctCount / questions.length) * 100;
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreMessage = () => {
    const percentage = (correctCount / questions.length) * 100;
    if (percentage === 100) return "완벽해요!";
    if (percentage >= 80) return "훌륭해요!";
    if (percentage >= 60) return "잘했어요!";
    if (percentage >= 40) return "조금 더 노력해봐요!";
    return "다시 한번 복습해봐요!";
  };

  // 결과 화면
  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        {/* 점수 카드 */}
        <div className="text-center p-6 bg-gradient-to-br from-brand/10 to-purple-500/10 rounded-2xl border border-brand/20">
          <div className="w-16 h-16 mx-auto mb-4 bg-brand/20 rounded-full flex items-center justify-center">
            <Trophy size={32} className="text-brand" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">퀴즈 완료!</h3>
          <div className={`text-4xl font-bold mb-2 ${getScoreColor()}`}>
            {correctCount} / {questions.length}
          </div>
          <p className="text-sm text-foreground-secondary">{getScoreMessage()}</p>
        </div>

        {/* 문제별 결과 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-foreground-tertiary mb-3">
            <Target size={14} />
            <span>문제별 결과</span>
          </div>
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                questionStates[idx].isCorrect
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-red-500/30 bg-red-500/5"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                questionStates[idx].isCorrect ? "bg-green-500" : "bg-red-500"
              }`}>
                {questionStates[idx].isCorrect ? (
                  <CheckCircle2 size={14} className="text-white" />
                ) : (
                  <span className="text-white text-xs font-medium">X</span>
                )}
              </div>
              <span className="text-sm text-foreground-secondary flex-1 line-clamp-1">
                {q.question}
              </span>
            </div>
          ))}
        </div>

        {/* 다시 풀기 버튼 */}
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-3 bg-background-overlay hover:bg-background-base border border-border rounded-xl text-sm font-medium text-foreground transition-colors"
        >
          <RotateCcw size={16} />
          다시 풀기
        </button>
      </motion.div>
    );
  }

  // 문제 풀이 화면
  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <QuizQuestionCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
            isAnswered={currentState.isAnswered}
            selectedIndex={currentState.selectedIndex}
          />
        </motion.div>
      </AnimatePresence>

      {/* 다음 문제 버튼 */}
      <AnimatePresence>
        {currentState.isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand hover:bg-brand/90 text-black rounded-xl text-sm font-medium transition-colors"
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  다음 문제
                  <ChevronRight size={16} />
                </>
              ) : (
                <>
                  결과 보기
                  <Trophy size={16} />
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
