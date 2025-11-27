/**
 * Script Panel Component
 * Record Script Display and Translation feature (DeepL API)
 */

"use client";

import { useState, useEffect } from "react";
import { useScriptTranslationStore, useAudioPlayerStore } from "@/stores";
import { Panel } from "./panel";
import { ScrollText, ArrowRight, Loader2, AlertCircle, Languages, Globe, FileText, ChevronRight } from "lucide-react";
import type { SupportedLanguage, LanguageOption, WordWithTime, PageContext } from "@/lib/types";
import { getPageContextAtTime } from "@/lib/api/audio.api";
import { useTranscriptTranslation } from "@/features/note/right-panel/use-transcript-translation";

interface ScriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
  activeSegmentId?: string | null;
  isRecording?: boolean; // Track if currently recording
  // 타임라인 관련 props
  onPageContextClick?: (context: PageContext) => void; // 페이지 배지 클릭 시 호출
  files?: { id: string; name: string; backendId?: string }[]; // 파일 이름 표시용 (backendId 포함)
}

// DeepL 지원 언어만 표시 (아랍어 제외)
const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
];

export function ScriptPanel({
  isOpen,
  onClose,
  audioRef,
  activeSegmentId,
  isRecording = false,
  onPageContextClick,
  files = [],
}: ScriptPanelProps) {
  // 🔥 타임라인 이벤트는 전역 스토어에서 직접 가져옴 (여러 컴포넌트에서 공유)
  const { timelineEvents } = useAudioPlayerStore();

  // 디버그: 스토어 값 변경 확인
  useEffect(() => {
    console.log('[ScriptPanel] 🔄 timelineEvents from store:', timelineEvents.length, timelineEvents);
  }, [timelineEvents]);

  const {
    scriptSegments,
    isTranslationEnabled,
    targetLanguage,
    originalLanguage,
    isTranslating,
    translationError,
    usageInfo,
    toggleTranslation,
    setTargetLanguage,
  } = useScriptTranslationStore();

  // DeepL 번역 Hook 사용
  useTranscriptTranslation();

  // Debug: Log segments with translation status
  useEffect(() => {
    console.log('[ScriptPanel] 📝 Segments update:', scriptSegments.map(s => ({
      id: s.id,
      original: s.originalText?.substring(0, 20),
      translated: s.translatedText?.substring(0, 20),
      hasTranslation: !!s.translatedText,
    })));
  }, [scriptSegments]);

  // Track current playback time for word-level highlighting
  const [currentTime, setCurrentTime] = useState(0);

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
   * Handle transcript segment click - seek to that time in audio and navigate to page
   * @param timestamp - Timestamp in milliseconds
   */
  const handleSegmentClick = (timestamp: number) => {
    const timeInSeconds = timestamp / 1000; // Convert ms to seconds
    console.log('[ScriptPanel] 🎯 Segment clicked:', {
      timestampMs: timestamp,
      timeInSeconds,
      timelineEventsCount: timelineEvents.length,
      hasOnPageContextClick: !!onPageContextClick,
    });

    if (audioRef?.current) {
      console.log('[ScriptPanel] Seeking to segment:', timeInSeconds, 'seconds (no auto-play)');
      audioRef.current.currentTime = timeInSeconds;
    }

    // 해당 시간의 페이지 컨텍스트로 이동
    const pageContext = getPageContextAtTime(timelineEvents, timeInSeconds);
    console.log('[ScriptPanel] 📖 Page context from timeline:', pageContext);
    if (pageContext && onPageContextClick) {
      console.log('[ScriptPanel] ✅ Calling onPageContextClick:', pageContext);
      onPageContextClick(pageContext);
    } else {
      console.log('[ScriptPanel] ⚠️ No page context or no callback:', {
        pageContext,
        hasCallback: !!onPageContextClick,
      });
    }
  };

  /**
   * Handle word click - seek to that word's time in audio and navigate to page
   * @param startTime - Start time in seconds
   */
  const handleWordClick = (startTime: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent segment click
    console.log('[ScriptPanel] 🔤 Word clicked:', {
      startTime,
      timelineEventsCount: timelineEvents.length,
      hasOnPageContextClick: !!onPageContextClick,
    });

    if (audioRef?.current) {
      console.log('[ScriptPanel] Seeking to word at:', startTime, 'seconds (no auto-play)');
      audioRef.current.currentTime = startTime;
    }

    // 해당 시간의 페이지 컨텍스트로 이동
    const pageContext = getPageContextAtTime(timelineEvents, startTime);
    console.log('[ScriptPanel] 📖 Page context from timeline:', pageContext);
    if (pageContext && onPageContextClick) {
      console.log('[ScriptPanel] ✅ Calling onPageContextClick:', pageContext);
      onPageContextClick(pageContext);
    } else {
      console.log('[ScriptPanel] ⚠️ No page context or no callback:', {
        pageContext,
        hasCallback: !!onPageContextClick,
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

  /**
   * 세그먼트 시간에 해당하는 페이지 컨텍스트 가져오기
   * @param timestampMs - 세그먼트 timestamp (밀리초)
   */
  const getSegmentPageContext = (timestampMs: number): PageContext | null => {
    if (!timelineEvents || timelineEvents.length === 0) return null;
    const timeInSeconds = timestampMs / 1000;
    return getPageContextAtTime(timelineEvents, timeInSeconds);
  };

  /**
   * backendId (fileId)로 파일 이름 가져오기
   * @param fileId - Backend File ID
   */
  const getFileNameByBackendId = (fileId: string | undefined): string | null => {
    if (!fileId) return null;
    const file = files.find((f) => f.backendId === fileId);
    if (!file) return null;
    // 파일명이 너무 길면 자르기
    const name = file.name;
    if (name.length > 15) {
      return name.slice(0, 12) + "...";
    }
    return name;
  };

  /**
   * 페이지 배지 클릭 핸들러
   */
  const handlePageBadgeClick = (context: PageContext, e: React.MouseEvent) => {
    e.stopPropagation(); // 세그먼트 클릭 방지
    console.log('[ScriptPanel] Page badge clicked:', context);
    if (onPageContextClick) {
      onPageContextClick(context);
    } else {
      console.warn('[ScriptPanel] onPageContextClick is not provided!');
    }
  };

  return (
    <Panel isOpen={isOpen} borderColor="gray" title="스크립트" onClose={onClose}>
      <div className="flex flex-col h-full">
        {/* Translation Controls - Sticky Header */}
        <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#252525] flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Translation Toggle */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isTranslationEnabled}
                  onChange={toggleTranslation}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#AFC02B] peer-checked:after:bg-white peer-checked:after:border-white transition-colors"></div>
              </div>
              <span className={`text-xs font-medium transition-colors ${isTranslationEnabled ? "text-[#AFC02B]" : "text-gray-400 group-hover:text-gray-300"}`}>
                실시간 번역
              </span>
            </label>

            {/* Language Select */}
            {isTranslationEnabled && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                    {originalLanguage}
                  </span>
                  <ArrowRight size={10} className="text-gray-600" />
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                    className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    {LANGUAGE_OPTIONS.filter((opt) => opt.code !== originalLanguage).map(
                      (option) => (
                        <option key={option.code} value={option.code} className="bg-[#252525]">
                          {option.nativeName}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-3 mt-2">
            {isTranslating && (
              <div className="flex items-center gap-1.5">
                <Loader2 size={10} className="animate-spin text-[#AFC02B]" />
                <span className="text-[10px] text-[#AFC02B]">번역 중...</span>
              </div>
            )}
            {/* 사용량 표시 */}
            {isTranslationEnabled && usageInfo && (
              <div className="flex items-center gap-2">
                <div className="w-12 h-1.5 bg-[#333] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usageInfo.remaining < 50000 ? 'bg-yellow-500' : 'bg-[#AFC02B]'
                    }`}
                    style={{ width: `${Math.min(100, (usageInfo.used / usageInfo.limit) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">
                  {Math.round(usageInfo.remaining / 1000)}K
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 번역 에러 배너 */}
        {translationError && (
          <div className={`px-4 py-2 border-b flex-shrink-0 ${
            translationError === 'quota_exceeded'
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className={`flex items-center gap-2 text-xs ${
              translationError === 'quota_exceeded' ? 'text-yellow-500' : 'text-red-400'
            }`}>
              <AlertCircle size={14} />
              <span>
                {translationError === 'config_error' && 'API 키가 설정되지 않았습니다.'}
                {translationError === 'auth_error' && 'API 키가 유효하지 않습니다.'}
                {translationError === 'quota_exceeded' && '월간 번역 한도를 초과했습니다.'}
                {translationError === 'api_error' && '번역 중 오류가 발생했습니다.'}
                {translationError === 'network_error' && '네트워크 오류가 발생했습니다.'}
              </span>
            </div>
          </div>
        )}

        {/* Script Content Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#1e1e1e]">
          {scriptSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
              <div className="w-16 h-16 bg-[#252525] rounded-full flex items-center justify-center mb-2">
                <ScrollText size={32} className="text-gray-500" />
              </div>
              <div>
                <p className="text-gray-300 text-sm font-medium">스크립트가 없습니다</p>
                <p className="text-gray-500 text-xs mt-1">음성을 녹음하거나 파일을 업로드하세요</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {scriptSegments.map((segment) => {
                const isActive = activeSegmentId === segment.id;
                const currentWord = segment.words ? getCurrentWord(segment.words) : null;
                const isPartial = (segment as any).isPartial || false;
                const pageContext = !isRecording && !isPartial ? getSegmentPageContext(segment.timestamp) : null;

                return (
                  <div
                    key={segment.id}
                    onClick={() => !isPartial && handleSegmentClick(segment.timestamp)}
                    className={`group relative rounded-xl p-3 transition-all ${isPartial
                      ? 'bg-[#252525]/50 opacity-60 cursor-default border border-dashed border-gray-700'
                      : isActive
                        ? 'bg-[#AFC02B]/5 border border-[#AFC02B]/30 shadow-[0_0_15px_rgba(175,192,43,0.05)]'
                        : 'bg-[#252525] border border-[#333] hover:border-[#444] cursor-pointer'
                      }`}
                  >
                    {/* Active Indicator Line */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-[#AFC02B] rounded-r-full" />
                    )}

                    {/* Header: Time & Speaker */}
                    <div className="flex items-center justify-between mb-2">
                      {!isRecording && !isPartial && (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-[#AFC02B]/20 text-[#AFC02B]' : 'bg-[#333] text-gray-400'
                            }`}>
                            {formatTime(segment.timestamp / 1000)}
                          </span>
                          {segment.speaker && (
                            <span className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                              {segment.speaker}
                            </span>
                          )}
                        </div>
                      )}

                      {isRecording && isPartial && (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#AFC02B] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#AFC02B]"></span>
                          </span>
                          <span className="text-[10px] text-[#AFC02B] font-medium animate-pulse">인식 중...</span>
                        </div>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="pl-1">
                      {segment.words && segment.words.length > 0 ? (
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-100' : 'text-gray-300'}`}>
                          {segment.words.map((word) => {
                            const isCurrentWord = isActive && currentWord?.wordIndex === word.wordIndex;

                            return (
                              <span
                                key={`${segment.id}-word-${word.wordIndex}`}
                                onClick={(e) => !isPartial && handleWordClick(word.startTime, e)}
                                className={`inline-block px-0.5 rounded-sm transition-all duration-150 mx-[1px] ${isPartial
                                  ? 'cursor-default'
                                  : 'cursor-pointer hover:text-[#AFC02B]'
                                  } ${isCurrentWord
                                    ? 'bg-[#AFC02B]/20 text-[#AFC02B] font-medium shadow-sm'
                                    : ''
                                  }`}
                                title={isPartial ? '인식 중...' : `${formatTime(word.startTime)}`}
                              >
                                {word.word}
                              </span>
                            );
                          })}
                        </p>
                      ) : (
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-100' : 'text-gray-300'}`}>
                          {segment.originalText}
                        </p>
                      )}

                      {/* Translation - 번역 텍스트가 있으면 항상 표시 */}
                      {segment.translatedText && (
                        <div className="mt-3 pt-2 border-t border-[#333] flex gap-2">
                          <Languages size={14} className="text-[#AFC02B] mt-0.5 flex-shrink-0 opacity-70" />
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {segment.translatedText}
                          </p>
                        </div>
                      )}

                      {/* Page Context Badge - 녹음 시 어떤 페이지를 보고 있었는지 표시 */}
                      {pageContext && (() => {
                        const fileName = getFileNameByBackendId(pageContext.fileId);
                        return (
                          <div className="mt-2 pt-2 border-t border-[#333]/50">
                            <button
                              onClick={(e) => handlePageBadgeClick(pageContext, e)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#333]/50 hover:bg-[#444]/50 rounded-md text-[10px] text-gray-400 hover:text-gray-200 transition-colors group/badge"
                              title={fileName ? `${fileName} ${pageContext.pageNumber}페이지로 이동` : `${pageContext.pageNumber}페이지로 이동`}
                            >
                              <FileText size={12} className="text-gray-500 group-hover/badge:text-[#AFC02B]" />
                              {fileName && (
                                <>
                                  <span className="truncate max-w-[100px]">{fileName}</span>
                                  <span className="text-gray-500">·</span>
                                </>
                              )}
                              <span className="font-medium">{pageContext.pageNumber}p</span>
                              <ChevronRight size={12} className="text-gray-600 group-hover/badge:text-[#AFC02B] group-hover/badge:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {scriptSegments.length > 0 && (
          <div className="px-4 py-2 bg-[#252525] border-t border-[#3c3c3c] flex items-center justify-between text-[10px] text-gray-500">
            <span>총 {scriptSegments.length}개 세그먼트</span>
            {isTranslationEnabled && (
              <span className="flex items-center gap-1">
                <Globe size={10} />
                {getLanguageName(originalLanguage)} → {getLanguageName(targetLanguage)}
              </span>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
