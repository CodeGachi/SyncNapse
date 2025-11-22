/**
 * Script Panel Component
 * Record Script Display and Translation feature
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useScriptTranslationStore } from "@/stores";
import { Panel } from "./panel";
import type { SupportedLanguage, LanguageOption, WordWithTime } from "@/lib/types";

interface ScriptPanelProps {
  noteId: string | null;
  isOpen: boolean;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
  activeSegmentId?: string | null;
  isTranslating?: boolean;
  translationSupported?: boolean | null;
  isRecording?: boolean; // Track if currently recording
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

export function ScriptPanel({ noteId, isOpen, onClose, audioRef, activeSegmentId, isTranslating, translationSupported, isRecording = false }: ScriptPanelProps) {
  const {
    scriptSegments,
    isTranslationEnabled,
    targetLanguage,
    originalLanguage,
    toggleTranslation,
    setTargetLanguage,
    reset: resetScriptTranslation,
  } = useScriptTranslationStore();

  // Track current playback time for word-level highlighting
  const [currentTime, setCurrentTime] = useState(0);

  // Track previous noteId to only reset when it actually changes to a different note
  const prevNoteIdRef = useRef<string | null>(null);

  // Reset script segments only when noteId changes to a DIFFERENT note
  useEffect(() => {
    // Only reset if noteId actually changed to a different value (not just re-mount)
    if (prevNoteIdRef.current !== null && prevNoteIdRef.current !== noteId) {
      console.log(`[ScriptPanel] Note changed from ${prevNoteIdRef.current} to ${noteId} - resetting script segments`);
      resetScriptTranslation();
    }
    prevNoteIdRef.current = noteId;
  }, [noteId, resetScriptTranslation]);

  // Debug: Log current audio time
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      console.log('[ScriptPanel] Current playback time:', audio.currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioRef]);

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getLanguageName = (code: SupportedLanguage): string => {
    return LANGUAGE_OPTIONS.find((opt) => opt.code === code)?.nativeName || code;
  };

  /**
   * Handle transcript segment click - seek to that time in audio
   * @param timestamp - Timestamp in milliseconds
   */
  const handleSegmentClick = (timestamp: number) => {
    if (audioRef?.current) {
      const timeInSeconds = timestamp / 1000; // Convert ms to seconds
      console.log('[ScriptPanel] Seeking to segment:', timeInSeconds, 'seconds');
      audioRef.current.currentTime = timeInSeconds;
      audioRef.current.play().catch((err) => {
        console.error('[ScriptPanel] Failed to play audio:', err);
      });
    }
  };

  /**
   * Handle word click - seek to that word's time in audio
   * @param startTime - Start time in seconds
   */
  const handleWordClick = (startTime: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent segment click
    if (audioRef?.current) {
      console.log('[ScriptPanel] Seeking to word at:', startTime, 'seconds');
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch((err) => {
        console.error('[ScriptPanel] Failed to play audio:', err);
      });
    }
  };

  /**
   * Find current word being played
   */
  const getCurrentWord = (words: WordWithTime[]): WordWithTime | null => {
    return words.find((word, index, arr) => {
      const nextWord = arr[index + 1];
      return currentTime >= word.startTime && 
             (!nextWord || currentTime < nextWord.startTime);
    }) || null;
  };

  return (
    <Panel isOpen={isOpen} borderColor="gray" title="Script" onClose={onClose}>
      <div className="p-6">
        {/* Translation Controls */}
        <div className="flex items-center gap-4 mb-4">

          {/* Translation Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isTranslationEnabled}
                onChange={toggleTranslation}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="text-white text-sm">번역</span>
            {isTranslating && (
              <span className="text-blue-400 text-xs ml-1">(번역 중...)</span>
            )}
            {translationSupported === false && isTranslationEnabled && (
              <span className="text-yellow-400 text-xs ml-1" title="브라우저가 Translation API를 지원하지 않습니다">
                ⚠️
              </span>
            )}
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

      {/* Script Content Area */}
      <div className="bg-[#1e1e1e] rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
        {scriptSegments.length === 0 ? (
          <p className="text-[#b9b9b9] text-sm text-center py-8">
            스크립트 내용이 여기에 표시됩니다.
          </p>
        ) : (
          <div className="space-y-2">
            {scriptSegments.map((segment) => {
              const isActive = activeSegmentId === segment.id;
              const currentWord = segment.words ? getCurrentWord(segment.words) : null;
              const isPartial = (segment as any).isPartial || false;
              
              return (
                <div
                  key={segment.id}
                  onClick={() => !isPartial && handleSegmentClick(segment.timestamp)}
                  className={`border-l-2 pl-3 py-1 transition-all ${
                    isPartial
                      ? 'border-gray-500 bg-gray-800/30 opacity-60 cursor-default'
                      : isActive
                      ? 'border-blue-400 bg-blue-900/30 cursor-pointer'
                      : 'border-blue-500 hover:border-blue-400 hover:bg-blue-900/10 cursor-pointer'
                  }`}
                >
                  {/* Timestamp and Speaker - Hide timestamp during recording */}
                  {!isRecording && !isPartial && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-mono ${isActive ? 'text-blue-300' : 'text-blue-400'}`}>
                        {formatTime(segment.timestamp / 1000)} {/* Convert ms to seconds for display */}
                      </span>
                      {segment.speaker && (
                        <span className="text-gray-400 text-xs">
                          • {segment.speaker}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Show interim indicator during recording */}
                  {isRecording && isPartial && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-400 italic">• 인식 중...</span>
                    </div>
                  )}

                  {/* Text - Word-level or full text */}
                  {segment.words && segment.words.length > 0 ? (
                    <p className={`text-sm leading-snug mb-1 ${isActive ? 'text-blue-100 font-medium' : 'text-white'}`}>
                      {segment.words.map((word) => {
                        const isCurrentWord = isActive && currentWord?.wordIndex === word.wordIndex;
                        
                        return (
                          <span
                            key={`${segment.id}-word-${word.wordIndex}`}
                            onClick={(e) => !isPartial && handleWordClick(word.startTime, e)}
                            className={`inline-block px-0.5 py-0.5 mx-0.5 rounded-sm transition-all duration-150 ${
                              isPartial 
                                ? 'cursor-default' 
                                : 'cursor-pointer hover:bg-blue-500/10 hover:text-blue-200'
                            } ${
                              isCurrentWord 
                                ? 'bg-blue-400/20 text-blue-50 font-medium underline decoration-blue-400 decoration-2 underline-offset-2' 
                                : ''
                            }`}
                            title={isPartial ? '인식 중...' : `${formatTime(word.startTime)}부터 재생 (신뢰도: ${Math.round((word.confidence ?? 1) * 100)}%)`}
                          >
                            {word.word}
                          </span>
                        );
                      })}
                    </p>
                  ) : (
                    <p className={`text-sm leading-snug mb-1 ${isActive ? 'text-blue-100 font-medium' : 'text-white'}`}>
                      {segment.originalText}
                    </p>
                  )}
                  
                  {/* Translation Text */}
                  {isTranslationEnabled && segment.translatedText && (
                    <p className="text-gray-300 text-sm leading-snug italic border-t border-gray-700 pt-1 mt-1">
                      {segment.translatedText}
                    </p>
                  )}
                </div>
              );
            })}
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
    </Panel>
  );
}
