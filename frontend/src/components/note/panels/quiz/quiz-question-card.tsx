/**
 * 퀴즈 문제 카드 컴포넌트
 * 한 문제씩 보여주고 사용자가 선택하면 정답 여부와 해설을 표시
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Lightbulb } from "lucide-react";
import type { QuizQuestion } from "@/lib/api/services/ai.api";

interface QuizQuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean) => void;
  isAnswered: boolean;
  selectedIndex: number | null;
}

export function QuizQuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isAnswered,
  selectedIndex,
}: QuizQuestionCardProps) {
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number | null>(selectedIndex);

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setLocalSelectedIndex(index);
    const isCorrect = index === question.correctIndex;
    onAnswer(isCorrect);
  };

  const getOptionStyle = (index: number) => {
    if (!isAnswered) {
      return localSelectedIndex === index
        ? "border-brand bg-brand/10 text-foreground"
        : "border-border hover:border-brand/50 hover:bg-background-base";
    }

    // 정답 공개 후
    if (index === question.correctIndex) {
      return "border-green-500 bg-green-500/10 text-green-400";
    }
    if (localSelectedIndex === index && index !== question.correctIndex) {
      return "border-red-500 bg-red-500/10 text-red-400";
    }
    return "border-border opacity-50";
  };

  const getOptionIcon = (index: number) => {
    if (!isAnswered) return null;

    if (index === question.correctIndex) {
      return <CheckCircle size={16} className="text-green-500 flex-shrink-0" />;
    }
    if (localSelectedIndex === index && index !== question.correctIndex) {
      return <XCircle size={16} className="text-red-500 flex-shrink-0" />;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 진행 표시 */}
      <div className="flex items-center justify-between text-xs text-foreground-tertiary">
        <span className="font-medium">
          문제 {questionNumber} / {totalQuestions}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < questionNumber
                  ? "bg-brand"
                  : i === questionNumber - 1
                  ? "bg-brand"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* 문제 */}
      <div className="text-sm font-medium text-foreground leading-relaxed">
        {question.question}
      </div>

      {/* 선택지 */}
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={isAnswered}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm border rounded-xl transition-all duration-200 ${getOptionStyle(index)}`}
            whileTap={!isAnswered ? { scale: 0.98 } : {}}
          >
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium border flex-shrink-0 ${
              isAnswered && index === question.correctIndex
                ? "border-green-500 text-green-500"
                : isAnswered && localSelectedIndex === index && index !== question.correctIndex
                ? "border-red-500 text-red-500"
                : localSelectedIndex === index
                ? "border-brand text-brand"
                : "border-foreground-tertiary text-foreground-tertiary"
            }`}>
              {String.fromCharCode(65 + index)}
            </span>
            <span className="flex-1">{option}</span>
            {getOptionIcon(index)}
          </motion.button>
        ))}
      </div>

      {/* 해설 */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={`p-4 rounded-xl border ${
              localSelectedIndex === question.correctIndex
                ? "border-green-500/30 bg-green-500/5"
                : "border-yellow-500/30 bg-yellow-500/5"
            }`}>
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-medium text-yellow-500">해설</span>
                  <p className="text-sm text-foreground-secondary leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
