/**
 * Summary (요약) 컨텐츠
 */

"use client";

import { useState } from "react";
import { generateSummary } from "@/lib/api/ai.api";

interface SummaryContentProps {
  noteId: string;
  onBack: () => void;
}

export function SummaryContent({ noteId, onBack }: SummaryContentProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState(5);

  const handleGenerate = async () => {
    if (!noteId) {
      setError("노트 ID가 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setSummary("");

    try {
      const response = await generateSummary({
        note_id: noteId,
        lines: lines,
        use_pdf: true,
      });

      setSummary(response.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요약 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h4 className="text-white font-semibold">Summary</h4>
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
        {/* 요약 생성 설정 */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              요약 줄 수 (1~10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#2a2a2a] text-white rounded border border-gray-600 focus:border-[#6C4F4F] focus:outline-none"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-4 py-2 bg-[#6C4F4F] text-white rounded hover:bg-[#5A4040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "요약 생성 중..." : "요약 생성"}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-500 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* 요약 결과 */}
        {summary && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold text-gray-400">요약 결과</h5>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summary);
                  // TODO: 토스트 알림 추가
                  alert("클립보드에 복사되었습니다!");
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                복사
              </button>
            </div>

            <div className="p-4 bg-[#2a2a2a] rounded-lg">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {summary}
              </div>
            </div>
          </div>
        )}

        {/* 로딩 중 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C4F4F]"></div>
          </div>
        )}
      </div>
    </div>
  );
}


