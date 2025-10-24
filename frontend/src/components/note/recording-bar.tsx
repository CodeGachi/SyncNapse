/**
 * 녹음바 UI 컴포넌트 (확장 가능)
 */

"use client";

import { useNoteEditorStore } from "@/stores";
import type { SupportedLanguage } from "@/lib/types";

interface Recording {
  id: number;
  title: string;
  time: string;
  date: string;
  duration: string;
}

interface RecordingBarProps {
  isPlaying: boolean;
  time: string;
  onPlayToggle: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  recordings?: Recording[];
  isScriptOpen?: boolean;
  onToggleScript?: () => void;
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ru: "Русский",
  ar: "العربية",
  pt: "Português",
};

export function RecordingBar({
  isPlaying,
  time,
  onPlayToggle,
  isExpanded = false,
  onToggleExpand,
  recordings = [],
  isScriptOpen = false,
  onToggleScript
}: RecordingBarProps) {
  const { isTranslationEnabled, targetLanguage, originalLanguage } = useNoteEditorStore();

  const displayLanguage = isTranslationEnabled
    ? `${LANGUAGE_NAMES[originalLanguage]} → ${LANGUAGE_NAMES[targetLanguage]}`
    : LANGUAGE_NAMES[originalLanguage];

  return (
    <div className={`w-full bg-[#363636] border-2 border-white rounded-[30px] transition-all duration-300 ${
      isExpanded ? 'h-[190px] p-[10px] px-6' : 'px-6 py-2.5'
    }`}>
      {/* 녹음바 컨트롤 */}
      <div className={`flex ${isExpanded ? 'flex-col gap-3' : 'items-center gap-2'} w-full`}>
      {/* 컨트롤 바 */}
      <div className="flex items-center gap-2 w-full">
        {/* 재생/일시정지 버튼 */}
        <button
          onClick={onPlayToggle}
          className="w-[33px] h-[33px] bg-[#444444] rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        >
          {isPlaying ? (
            /* 일시정지 아이콘 */
            <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
              <rect x="0" y="0" width="4" height="14" fill="white" />
              <rect x="8" y="0" width="4" height="14" fill="white" />
            </svg>
          ) : (
            /* 재생 아이콘 */
            <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
              <path d="M0 0L10 6L0 12V0Z" fill="white" />
            </svg>
          )}
        </button>

        {/* 시간 표시 */}
        <div className="px-3 py-1">
          <p className="text-[#b9b9b9] text-[12px] font-bold">{time}</p>
        </div>

        {/* 언어 표시 */}
        <div className="flex items-center gap-1 px-1 py-1">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="white" strokeWidth="2" />
            <path
              d="M1 9h16M9 1c-2.5 3-2.5 13 0 16M9 1c2.5 3 2.5 13 0 16"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
          <span
            className={`text-white text-[12px] font-bold ${isTranslationEnabled ? 'text-blue-400' : ''}`}
            title={isTranslationEnabled ? "번역 활성화됨" : ""}
          >
            {displayLanguage}
          </span>
        </div>

        {/* 북마크 */}
        <button className="flex items-center gap-1 px-1 py-1 cursor-pointer hover:opacity-80 transition-opacity">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <path
              d="M3 2h10v12l-5-3-5 3V2z"
              fill="white"
            />
          </svg>
          <span className="text-white text-[12px] font-bold">북마크</span>
        </button>

        {/* 구분선 */}
        <div className="w-px h-5 bg-white" />

        {/* 종료 버튼 */}
        <button className="px-3 py-1 cursor-pointer hover:opacity-80 transition-opacity">
          <span className="text-white text-[12px] font-bold">종료</span>
        </button>

        {/* 구분선 */}
        <div className="w-px h-5 bg-white" />

        {/* 확대 아이콘들 */}
        <div className="flex items-center gap-3 px-2 py-1">
          {/* 녹음 목록 확장 버튼 */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <svg width="19" height="18" viewBox="0 0 19 18" fill="white">
                <rect x="2" y="2" width="6" height="6" fill="white" />
                <rect x="11" y="2" width="6" height="6" fill="white" />
                <rect x="2" y="10" width="6" height="6" fill="white" />
                <rect x="11" y="10" width="6" height="6" fill="white" />
              </svg>
            </button>
          )}
          {/* 스크립트 버튼 (두 번째 버튼) */}
          {onToggleScript && (
            <button
              onClick={onToggleScript}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <svg width="19" height="19" viewBox="0 0 19 19" fill="white">
                <path
                  d="M2 9.5h15M9.5 2v15"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 녹음 목록 (확장 시 - 녹음바 내부) */}
      {isExpanded && recordings.length > 0 && (
        <div className="flex flex-col gap-1 w-full max-h-[120px] overflow-y-auto">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="flex items-center justify-between py-2 px-3 hover:bg-[#444444] rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <p className="text-white text-xs font-bold">{recording.title}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[#b9b9b9] text-[10px] font-bold">{recording.time}</p>
                  <p className="text-[#b9b9b9] text-[10px] font-bold">{recording.date}</p>
                </div>
              </div>
              <p className="text-[#b9b9b9] text-[10px] font-bold px-3 py-1">{recording.duration}</p>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
