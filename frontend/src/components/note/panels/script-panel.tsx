/**
 * 스크립트 패널 컴포넌트
 *
 * 녹음 스크립트 표시 및 번역 기능 (DeepL API)
 */

"use client";

import { useEffect } from "react";
import { useScriptTranslationStore, useAudioPlayerStore } from "@/stores";
import { Panel } from "./panel";
import { ScrollText, ArrowRight, Loader2, AlertCircle, Languages, Globe, FileText, ChevronRight, Pencil, Check, X, RotateCcw } from "lucide-react";
import type { SupportedLanguage, LanguageOption, PageContext } from "@/lib/types";
import { useTranscriptTranslation, useScriptPanel } from "@/features/note/right-panel";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("ScriptPanel");

interface ScriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
  activeSegmentId?: string | null;
  isRecording?: boolean; // Track if currently recording
  // 타임라인 관련 props
  onPageContextClick?: (context: PageContext) => void; // 페이지 배지 클릭 시 호출
  files?: { id: string; name: string; backendId?: string }[]; // 파일 이름 표시용 (backendId 포함)
  // 편집 모드 관련 props
  sessionId?: string; // 리비전 저장 시 필요
  onSaveRevision?: (sessionId: string, editedSegments: Record<string, string>) => Promise<void>;
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
  sessionId,
  onSaveRevision,
}: ScriptPanelProps) {
  // 타임라인 이벤트는 전역 스토어에서 직접 가져옴 (여러 컴포넌트에서 공유)
  const { timelineEvents } = useAudioPlayerStore();

  // 디버그: 스토어 값 변경 확인
  useEffect(() => {
    log.debug("타임라인 이벤트 업데이트:", timelineEvents.length, timelineEvents);
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
    // Edit Mode
    isEditMode,
    editedSegments,
    saveStatus,
    setEditMode,
    updateEditedSegment,
    revertSegment,
    resetEdits,
    setSaveStatus,
    setSaveRevisionCallback,
  } = useScriptTranslationStore();

  // DeepL 번역 Hook 사용
  useTranscriptTranslation();

  // 스크립트 패널 훅 (세그먼트/워드 클릭, 페이지 컨텍스트 탐색)
  const {
    currentTime,
    handleSegmentClick,
    handleWordClick,
    handlePageBadgeClick,
    getCurrentWord,
    getSegmentPageContext,
    getFileNameByBackendId,
  } = useScriptPanel({
    audioRef,
    timelineEvents,
    onPageContextClick,
    files,
  });

  // 저장 콜백 등록 (세션 변경 시 자동 저장용)
  useEffect(() => {
    if (onSaveRevision) {
      setSaveRevisionCallback(onSaveRevision);
    }
    return () => {
      setSaveRevisionCallback(null);
    };
  }, [onSaveRevision, setSaveRevisionCallback]);

  // 디버그: 세그먼트 번역 상태 로깅
  useEffect(() => {
    log.debug("세그먼트 업데이트:", scriptSegments.map(s => ({
      id: s.id,
      original: s.originalText?.substring(0, 20),
      translated: s.translatedText?.substring(0, 20),
      hasTranslation: !!s.translatedText,
    })));
  }, [scriptSegments]);

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
   * 편집 모드 시작
   */
  const handleStartEdit = () => {
    if (isRecording) return; // 녹음 중에는 편집 불가
    setEditMode(true);
  };

  /**
   * 편집 완료 (저장)
   */
  const handleSaveEdit = async () => {
    log.debug("편집 저장 호출:", {
      sessionId,
      editedSegmentsCount: Object.keys(editedSegments).length,
      editedSegments,
      hasOnSaveRevision: !!onSaveRevision,
    });

    if (!sessionId || Object.keys(editedSegments).length === 0) {
      log.debug("저장 건너뜀 - sessionId 없음 또는 편집 없음");
      setEditMode(false);
      return;
    }

    setSaveStatus('saving');
    try {
      if (onSaveRevision) {
        await onSaveRevision(sessionId, editedSegments);
      }
      setSaveStatus('saved');
      // 2초 후 저장 상태 초기화
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      log.error("리비전 저장 오류:", error);
      setSaveStatus('error');
    }
    setEditMode(false);
  };

  /**
   * 편집 취소
   */
  const handleCancelEdit = () => {
    resetEdits();
    setEditMode(false);
  };

  /**
   * 편집 중인 내용 자동 저장 (패널 닫기/세션 변경 시)
   */
  const saveEditedContent = async () => {
    if (!isEditMode || !sessionId || Object.keys(editedSegments).length === 0) {
      return;
    }

    log.debug("자동 저장 시작 (닫기/변경 전)");
    setSaveStatus('saving');
    try {
      if (onSaveRevision) {
        await onSaveRevision(sessionId, editedSegments);
      }
      setSaveStatus('saved');
      resetEdits();
      setEditMode(false);
      log.debug("자동 저장 완료");
    } catch (error) {
      log.error("자동 저장 실패:", error);
      setSaveStatus('error');
    }
  };

  /**
   * 패널 닫기 핸들러 (자동 저장 후 닫기)
   */
  const handleClose = async () => {
    await saveEditedContent();
    onClose();
  };

  /**
   * 수정된 세그먼트 개수
   */
  const editedCount = Object.keys(editedSegments).length;

  return (
    <Panel isOpen={isOpen} borderColor="gray" title="스크립트" onClose={handleClose}>
      <div className="flex flex-col h-full">
        {/* Translation Controls - Sticky Header */}
        <div className="px-4 py-3 border-b border-border bg-background-elevated flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Translation Toggle */}
            <label className={`flex items-center gap-2 cursor-pointer group ${isEditMode ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isTranslationEnabled}
                  onChange={toggleTranslation}
                  disabled={isEditMode}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-background-overlay peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground-tertiary after:border-foreground-tertiary after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand peer-checked:after:bg-white peer-checked:after:border-white transition-colors"></div>
              </div>
              <span className={`text-xs font-medium transition-colors ${isTranslationEnabled ? "text-brand" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
                실시간 번역
              </span>
            </label>

            {/* Edit Mode Buttons */}
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Check size={14} />
                    완료
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saveStatus === 'saving'}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground-tertiary hover:text-foreground hover:bg-background-overlay rounded-md transition-colors disabled:opacity-50"
                  >
                    <X size={14} />
                    취소
                  </button>
                </>
              ) : (
                <>
                  {!isRecording && scriptSegments.length > 0 && (
                    <button
                      onClick={handleStartEdit}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground-tertiary hover:text-foreground hover:bg-background-overlay rounded-md transition-colors"
                    >
                      <Pencil size={14} />
                      편집
                    </button>
                  )}
                  {/* Language Select */}
                  {isTranslationEnabled && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-background-surface rounded-lg border border-border">
                        <span className="text-[10px] text-foreground-tertiary uppercase tracking-wider font-bold">
                          {originalLanguage}
                        </span>
                        <ArrowRight size={10} className="text-foreground-tertiary" />
                        <select
                          value={targetLanguage}
                          onChange={(e) => setTargetLanguage(e.target.value as SupportedLanguage)}
                          className="bg-transparent text-foreground text-xs font-medium focus:outline-none cursor-pointer"
                        >
                          {LANGUAGE_OPTIONS.filter((opt) => opt.code !== originalLanguage).map(
                            (option) => (
                              <option key={option.code} value={option.code} className="bg-background-elevated">
                                {option.nativeName}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-3 mt-2">
            {isTranslating && (
              <div className="flex items-center gap-1.5">
                <Loader2 size={10} className="animate-spin text-brand" />
                <span className="text-[10px] text-brand">번역 중...</span>
              </div>
            )}
            {/* 사용량 표시 */}
            {isTranslationEnabled && usageInfo && (
              <div className="flex items-center gap-2">
                <div className="w-12 h-1.5 bg-background-overlay rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usageInfo.remaining < 50000 ? 'bg-yellow-500' : 'bg-brand'
                    }`}
                    style={{ width: `${Math.min(100, (usageInfo.used / usageInfo.limit) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-foreground-tertiary">
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
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-background-surface">
          {scriptSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
              <div className="w-16 h-16 bg-background-elevated rounded-full flex items-center justify-center mb-2">
                <ScrollText size={32} className="text-foreground-tertiary" />
              </div>
              <div>
                <p className="text-foreground-secondary text-sm font-medium">스크립트가 없습니다</p>
                <p className="text-foreground-tertiary text-xs mt-1">음성을 녹음하거나 파일을 업로드하세요</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {scriptSegments.map((segment) => {
                const isActive = activeSegmentId === segment.id;
                const currentWord = segment.words ? getCurrentWord(segment.words) : null;
                const isPartial = (segment as any).isPartial || false;
                const pageContext = !isRecording && !isPartial ? getSegmentPageContext(segment.timestamp) : null;

                // 편집된 세그먼트인지 확인
                const isEdited = !!editedSegments[segment.id];

                return (
                  <div
                    key={segment.id}
                    onClick={() => !isPartial && !isEditMode && handleSegmentClick(segment.timestamp)}
                    className={`group relative rounded-xl p-3 transition-all ${isPartial
                      ? 'bg-background-elevated/50 opacity-60 cursor-default border border-dashed border-border'
                      : isEditMode
                        ? isEdited
                          ? 'bg-background-elevated border border-brand/50'  // 편집됨
                          : 'bg-background-elevated border border-border'        // 편집 모드
                        : isActive
                          ? 'bg-brand/5 border border-brand/30 shadow-[0_0_15px_rgba(175,192,43,0.05)]'
                          : 'bg-background-elevated border border-border hover:border-border-hover cursor-pointer'
                      }`}
                  >
                    {/* Active Indicator Line */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-brand rounded-r-full" />
                    )}

                    {/* Header: Time & Speaker & Revert Button */}
                    <div className="flex items-center justify-between mb-2">
                      {!isRecording && !isPartial && (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-brand/20 text-brand' : 'bg-background-overlay text-foreground-tertiary'
                            }`}>
                            {formatTime(segment.timestamp / 1000)}
                          </span>
                          {segment.speaker && (
                            <span className="text-foreground-tertiary text-[10px] font-medium uppercase tracking-wider">
                              {segment.speaker}
                            </span>
                          )}
                        </div>
                      )}

                      {isRecording && isPartial && (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                          </span>
                          <span className="text-[10px] text-brand font-medium animate-pulse">인식 중...</span>
                        </div>
                      )}

                      {/* 편집 모드: 되돌리기 버튼 */}
                      {isEditMode && editedSegments[segment.id] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            revertSegment(segment.id);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-foreground-tertiary hover:text-brand hover:bg-background-overlay rounded transition-colors"
                          title="원본으로 되돌리기"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="pl-1">
                      {isEditMode && !isPartial ? (
                        /* 편집 모드: textarea */
                        <textarea
                          value={editedSegments[segment.id] ?? segment.originalText}
                          onChange={(e) => updateEditedSegment(segment.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full bg-background-surface text-sm leading-relaxed text-foreground border rounded-lg p-2 resize-none focus:outline-none focus:border-brand transition-colors ${
                            editedSegments[segment.id]
                              ? 'border-brand/50'
                              : 'border-border'
                          }`}
                          rows={Math.max(2, Math.ceil((editedSegments[segment.id] ?? segment.originalText).length / 40))}
                          placeholder="스크립트를 입력하세요..."
                        />
                      ) : segment.words && segment.words.length > 0 ? (
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-foreground' : 'text-foreground-secondary'}`}>
                          {segment.words.map((word) => {
                            const isCurrentWord = isActive && currentWord?.wordIndex === word.wordIndex;

                            return (
                              <span
                                key={`${segment.id}-word-${word.wordIndex}`}
                                onClick={(e) => !isPartial && handleWordClick(word.startTime, e)}
                                className={`inline-block px-0.5 rounded-sm transition-all duration-150 mx-[1px] ${isPartial
                                  ? 'cursor-default'
                                  : 'cursor-pointer hover:text-brand'
                                  } ${isCurrentWord
                                    ? 'bg-brand/20 text-brand font-medium shadow-sm'
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
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-foreground' : 'text-foreground-secondary'}`}>
                          {segment.originalText}
                        </p>
                      )}

                      {/* Translation - 번역 텍스트가 있으면 항상 표시 */}
                      {segment.translatedText && (
                        <div className="mt-3 pt-2 border-t border-border flex gap-2">
                          <Languages size={14} className="text-brand mt-0.5 flex-shrink-0 opacity-70" />
                          <p className="text-foreground-tertiary text-sm leading-relaxed">
                            {segment.translatedText}
                          </p>
                        </div>
                      )}

                      {/* Page Context Badge - 녹음 시 어떤 페이지를 보고 있었는지 표시 */}
                      {pageContext && (() => {
                        const fileName = getFileNameByBackendId(pageContext.fileId);
                        return (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <button
                              onClick={(e) => handlePageBadgeClick(pageContext, e)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-background-overlay/50 hover:bg-background-overlay rounded-md text-[10px] text-foreground-tertiary hover:text-foreground transition-colors group/badge"
                              title={fileName ? `${fileName} ${pageContext.pageNumber}페이지로 이동` : `${pageContext.pageNumber}페이지로 이동`}
                            >
                              <FileText size={12} className="text-foreground-tertiary group-hover/badge:text-brand" />
                              {fileName && (
                                <>
                                  <span className="truncate max-w-[100px]">{fileName}</span>
                                  <span className="text-foreground-tertiary">·</span>
                                </>
                              )}
                              <span className="font-medium">{pageContext.pageNumber}p</span>
                              <ChevronRight size={12} className="text-foreground-tertiary group-hover/badge:text-brand group-hover/badge:translate-x-0.5 transition-transform" />
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
          <div className="px-4 py-2 bg-background-elevated border-t border-border flex items-center justify-between text-[10px] text-foreground-tertiary">
            {isEditMode ? (
              /* 편집 모드 푸터 */
              <>
                <span className={editedCount > 0 ? 'text-brand' : ''}>
                  {editedCount > 0 ? `${editedCount}개 수정됨` : '수정 없음'}
                </span>
                <span className="flex items-center gap-1.5">
                  {saveStatus === 'saving' && (
                    <>
                      <Loader2 size={10} className="animate-spin" />
                      <span>저장 중...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <Check size={10} className="text-brand" />
                      <span className="text-brand">저장됨</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <AlertCircle size={10} className="text-red-400" />
                      <span className="text-red-400">저장 실패</span>
                    </>
                  )}
                </span>
              </>
            ) : (
              /* 일반 모드 푸터 */
              <>
                <span>총 {scriptSegments.length}개 세그먼트</span>
                {isTranslationEnabled && (
                  <span className="flex items-center gap-1">
                    <Globe size={10} />
                    {getLanguageName(originalLanguage)} → {getLanguageName(targetLanguage)}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
