/**
 * Script Panel Component * Record Script Display and Translation feature
 */
"use client";

import { useScriptTranslationStore } from "@/stores";
import type { SupportedLanguage, LanguageOption } from "@/lib/types";

interface ScriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
];

export function ScriptPanel({ isOpen, onClose }: ScriptPanelProps) {
  const {
    scriptSegments,
    isTranslationEnabled,
    targetLanguage,
    originalLanguage,
    toggleTranslation,
    setTargetLanguage,
  } = useScriptTranslationStore();

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getLanguageName = (code: SupportedLanguage): string => {
    return LANGUAGE_OPTIONS.find((opt) => opt.code === code)?.nativeName || code;
  };

  return (
    <div className="mt-3 bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-6 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-white text-lg font-bold">Script</h3>

          {/* Translation Toggle */}
          <label className="flex items-center gap-2 cursor-pointer"> <div className="relative">
            <input
              type="checkbox"
              checked={isTranslationEnabled}
              onChange={toggleTranslation}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
            <span className="text-white text-sm">번역</span>
          </label>

          {/* Language Select */}
          {isTranslationEnabled && (<div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              {getLanguageName(originalLanguage)}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8h10M8 3l5 5-5 5"
                stroke="#b9b9b9"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
              className="bg-[#1e1e1e] text-white text-sm px-3 py-1 rounded-md border border-[#3a3a3a] focus:outline-none focus:border-blue-500"
            >
              {LANGUAGE_OPTIONS.filter((opt) => opt.code !== originalLanguage).map(
                (option) => (
                  <option key={option.code} value={option.code}>
                    {option.nativeName}
                  </option>
                )
              )}
            </select>
          </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-[#b9b9b9] hover:text-white transition-colors"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* sscript Content Area */}
      <div className="bg-[#1e1e1e] rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
        {scriptSegments.length === 0 ? (<p className="text-[#b9b9b9] text-sm text-center py-8">
          스크립트 내용이 여기에 표시됩니다.
        </p>
        ) : (
          <div className="space-y-4">
            {scriptSegments.map((segment) => (
              <div
                key={segment.id}
                className="border-l-2 border-blue-500 pl-3 py-1"
              >
                {/* stamp and */}
                <div className="flex items-center gap-2 mb-1"> <span className="text-blue-400 text-xs font-mono">
                  {formatTime(segment.timestamp)}
                </span>
                  {segment.speaker && (
                    <span className="text-gray-400 text-xs">
                      • {segment.speaker}
                    </span>
                  )}
                </div>

                {/* Text */}
                <p className="text-white text-sm lead-relaxed mb-2">
                  {segment.originalText}
                </p>
                {/* Translation Text */}
                {isTranslationEnabled
                  && segment.translatedText &&
                  (<p className="text-gray-300 text-sm leading-relaxed italic border-t border-gray-700 pt-2">
                    {segment.translatedText}
                  </p>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Information */}
      {scriptSegments.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>{scriptSegments.length}개 세그먼트</span>
          {isTranslationEnabled && (
            <span>
              번역: {getLanguageName(originalLanguage)} → {getLanguageName(targetLanguage)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
