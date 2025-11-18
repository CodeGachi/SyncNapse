/**
 * Summary Section 컴포넌트
 * Claude API를 사용하여 노트 내용 요약 생성
 */

"use client";

import { useState } from "react";
import { generateSummary } from "@/lib/ai/claude-client";

interface SummarySectionProps {
  noteContent: string;
}

export function SummarySection({ noteContent }: SummarySectionProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!noteContent || noteContent.trim().length === 0) {
      setError("요약할 내용이 없습니다. PDF를 업로드하거나 노트를 작성해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSummary("");

    try {
      const result = await generateSummary(noteContent);
      setSummary(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "요약 생성 중 오류가 발생했습니다.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* 버튼 영역 */}
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-[#6C4F4F] text-white rounded-lg hover:bg-[#5a4040] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
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
          ) : summary ? (
            "재생성"
          ) : (
            "요약 생성"
          )}
        </button>

        {summary && (
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            title="복사"
          >
            {copied ? "✓" : "📋"}
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex-shrink-0">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 요약 결과 */}
      {summary && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h4 className="text-white font-semibold mb-2 text-sm">📄 요약</h4>
            <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {summary}
            </div>
          </div>
        </div>
      )}

      {/* 안내 메시지 (요약이 없을 때) */}
      {!summary && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 text-sm">
            <p className="mb-2">📝 노트 내용을 요약해드립니다</p>
            <p className="text-xs text-gray-500">
              PDF와 노트 필기를 기반으로 핵심 포인트를 추출합니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
