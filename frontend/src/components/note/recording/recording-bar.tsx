/**
 * 녹음바 UI 컴포넌트
 * - 컴팩트: 녹음, 저장, 시간
 * - 확장: + 프로그레스, 재생, 뒤로, 목록
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// 초를 mm:ss 형식으로 변환
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

interface RecordingBarProps {
  isPlaying: boolean;
  time: string;
  onPlayToggle: () => void;
  onStop?: () => void;
  onSave?: () => void;
  onSkipBack?: () => void;
  isRecording?: boolean;
  onToggleRecordingList?: () => void;
  recordingCount?: number;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
}

export function RecordingBar({
  isPlaying,
  time,
  onPlayToggle,
  onStop,
  onSave,
  onSkipBack,
  isRecording = false,
  onToggleRecordingList,
  currentTime = 0,
  duration = 0,
  onSeek,
}: RecordingBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const isPlaybackMode = duration > 0 && !isRecording;

  // 프로그레스바 위치 계산
  const calculateSeekTime = useCallback((clientX: number) => {
    if (!progressRef.current || !isPlaybackMode || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onSeek?.(newTime);
  }, [isPlaybackMode, duration, onSeek]);

  // 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isPlaybackMode) return;
    setIsDragging(true);
    calculateSeekTime(e.clientX);
  }, [isPlaybackMode, calculateSeekTime]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    calculateSeekTime(e.clientX);
  }, [isDragging, calculateSeekTime]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 드래그 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`
        flex items-center bg-[#e5e7eb] dark:bg-background-elevated rounded-full px-3 py-1.5
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isExpanded ? "gap-3 pr-2" : "gap-2"}
      `}
    >
      {/* 녹음 버튼 */}
      <button
        onClick={onPlayToggle}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
          transition-all duration-300 flex-shrink-0 bg-[#d1d5db] dark:bg-background-overlay hover:bg-[#9ca3af] dark:hover:bg-background-base
          hover:scale-105 active:scale-95
        `}
        title={isRecording ? "녹음 일시정지/재개" : "녹음 시작"}
      >
        <svg
          width={14}
          height={17}
          viewBox="0 0 13 17"
          fill="none"
          className={`transition-all duration-300 ${
            !isRecording
              ? "text-foreground"
              : isPlaying
                ? "text-red-500"
                : "text-foreground-tertiary"
          }`}
        >
          <path
            d="M6.5 11.9C7.47404 11.8989 8.40786 11.5104 9.09661 10.8199C9.78536 10.1294 10.1728 9.1932 10.1739 8.21667V3.68333C10.1739 2.70645 9.78684 1.76958 9.09785 1.07882C8.40886 0.388064 7.47438 0 6.5 0C5.52562 0 4.59114 0.388064 3.90215 1.07882C3.21316 1.76958 2.82609 2.70645 2.82609 3.68333V8.21667C2.82721 9.1932 3.21464 10.1294 3.90339 10.8199C4.59214 11.5104 5.52596 11.8989 6.5 11.9ZM4.52174 3.68333C4.52174 3.15732 4.73016 2.65285 5.10116 2.28091C5.47215 1.90896 5.97533 1.7 6.5 1.7C7.02467 1.7 7.52785 1.90896 7.89884 2.28091C8.26984 2.65285 8.47826 3.15732 8.47826 3.68333V8.21667C8.47826 8.74268 8.26984 9.24715 7.89884 9.6191C7.52785 9.99104 7.02467 10.2 6.5 10.2C5.97533 10.2 5.47215 9.99104 5.10116 9.6191C4.73016 9.24715 4.52174 8.74268 4.52174 8.21667V3.68333ZM7.34783 14.6781V16.15C7.34783 16.3754 7.2585 16.5916 7.0995 16.751C6.9405 16.9104 6.72486 17 6.5 17C6.27514 17 6.05949 16.9104 5.9005 16.751C5.7415 16.5916 5.65217 16.3754 5.65217 16.15V14.6781C4.08937 14.4698 2.65505 13.7001 1.61555 12.5117C0.576046 11.3234 0.00199762 9.79725 0 8.21667C0 7.99123 0.0893242 7.77503 0.248322 7.61563C0.407321 7.45622 0.622969 7.36667 0.847826 7.36667C1.07268 7.36667 1.28833 7.45622 1.44733 7.61563C1.60633 7.77503 1.69565 7.99123 1.69565 8.21667C1.69565 9.49413 2.20182 10.7193 3.10281 11.6226C4.0038 12.5259 5.22581 13.0333 6.5 13.0333C7.77419 13.0333 8.9962 12.5259 9.89719 11.6226C10.7982 10.7193 11.3043 9.49413 11.3043 8.21667C11.3043 7.99123 11.3937 7.77503 11.5527 7.61563C11.7117 7.45622 11.9273 7.36667 12.1522 7.36667C12.377 7.36667 12.5927 7.45622 12.7517 7.61563C12.9107 7.77503 13 7.99123 13 8.21667C12.998 9.79725 12.424 11.3234 11.3844 12.5117C10.3449 13.7001 8.91063 14.4698 7.34783 14.6781Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* 저장 버튼 */}
      <button
        onClick={isRecording && onSave ? onSave : undefined}
        disabled={!isRecording}
        className={`
          w-8 h-8 bg-[#d1d5db] dark:bg-background-overlay rounded-full flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${isRecording ? "cursor-pointer hover:bg-[#9ca3af] dark:hover:bg-background-base hover:scale-105 active:scale-95" : "opacity-40 cursor-not-allowed"}
        `}
        title="저장"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="text-foreground">
          <path
            d="M5.36621 7.21429C5.36621 6.75963 5.54682 6.32359 5.86831 6.0021C6.1898 5.68061 6.62584 5.5 7.0805 5.5H15.6519C16.1066 5.5 16.5426 5.68061 16.8641 6.0021C17.1856 6.32359 17.3662 6.75963 17.3662 7.21429V15.7857C17.3662 16.2404 17.1856 16.6764 16.8641 16.9979C16.5426 17.3194 16.1066 17.5 15.6519 17.5H7.0805C6.62584 17.5 6.1898 17.3194 5.86831 16.9979C5.54682 16.6764 5.36621 16.2404 5.36621 15.7857V7.21429Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* 시간 */}
      <div className="px-1 flex-shrink-0 min-w-[45px]">
        <p className="text-[12px] font-mono whitespace-nowrap text-foreground-tertiary transition-colors duration-300">
          {isPlaybackMode ? formatTime(currentTime) : time}
        </p>
      </div>

      {/* 확장 영역 - 스타일리시한 슬라이드 애니메이션 */}
      <div
        className={`
          flex items-center gap-2 overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isExpanded
            ? "max-w-[180px] opacity-100 scale-100"
            : "max-w-0 opacity-0 scale-95"
          }
        `}
        style={{
          transform: isExpanded ? "translateX(0)" : "translateX(-10px)",
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* 재생 위치 바 */}
        <div
          ref={progressRef}
          className={`
            w-[40px] h-[4px] flex-shrink-0 relative bg-[#d1d5db] dark:bg-background-overlay rounded-full
            transition-all duration-300
            ${isPlaybackMode ? "cursor-pointer hover:h-[6px]" : "cursor-not-allowed opacity-50"}
          `}
          onMouseDown={handleMouseDown}
        >
          {isPlaybackMode && duration > 0 && (
            <div
              className={`absolute left-0 top-0 h-full bg-brand rounded-full ${isDragging ? "" : "transition-all duration-150"}`}
              style={{ width: `${Math.min((currentTime / duration) * 100, 100)}%` }}
            />
          )}
          {isPlaybackMode && duration > 0 && (
            <div
              className={`
                absolute top-1/2 w-3 h-3 bg-white rounded-full shadow-md
                transition-all duration-150 hover:scale-125
                ${isDragging ? "scale-125" : ""}
              `}
              style={{
                left: `${Math.min((currentTime / duration) * 100, 100)}%`,
                transform: "translate(-50%, -50%)"
              }}
            />
          )}
        </div>

        {/* 간격 */}
        <div className="w-2 flex-shrink-0" />

        {/* 재생/일시정지 */}
        <button
          onClick={isPlaybackMode && onStop ? onStop : undefined}
          disabled={!isPlaybackMode}
          className={`
            w-8 h-8 bg-[#d1d5db] dark:bg-background-overlay rounded-full flex items-center justify-center flex-shrink-0
            transition-all duration-300
            ${isPlaybackMode ? "cursor-pointer hover:bg-[#9ca3af] dark:hover:bg-background-base hover:scale-105 active:scale-95" : "opacity-40 cursor-not-allowed"}
          `}
          title={isPlaybackMode ? (isPlaying ? "일시정지" : "재생") : "녹음본 선택 필요"}
        >
          {isPlaybackMode && isPlaying ? (
            <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor" className="text-foreground">
              <rect x="0" y="0" width="4" height="14" fill="currentColor" />
              <rect x="8" y="0" width="4" height="14" fill="currentColor" />
            </svg>
          ) : (
            <svg
              width={16}
              height={16}
              viewBox="0 0 19 19"
              fill="none"
              className={`text-foreground ${!isPlaybackMode ? "opacity-50" : ""}`}
            >
              <path
                d="M5.54199 3.16602V15.8327L15.8337 9.49935L5.54199 3.16602Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* 뒤로 */}
        <button
          onClick={isPlaybackMode && onSkipBack ? onSkipBack : undefined}
          disabled={!isPlaybackMode}
          className={`
            w-7 h-7 flex items-center justify-center flex-shrink-0
            transition-all duration-300
            ${isPlaybackMode ? "cursor-pointer hover:scale-110 active:scale-95" : "opacity-40 cursor-not-allowed"}
          `}
          title="맨앞으로"
        >
          <svg width={16} height={16} viewBox="0 0 23 23" fill="none" className="text-foreground">
            <path
              d="M19.167 4.79102V18.2077L7.66699 11.4993L19.167 4.79102Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.83301 4.79102V18.2077"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* 목록 */}
        {onToggleRecordingList && (
          <button
            onClick={onToggleRecordingList}
            className="
              flex items-center justify-center w-8 h-8 rounded-full
              bg-[#d1d5db] dark:bg-background-overlay hover:bg-[#9ca3af] dark:hover:bg-background-base cursor-pointer
              transition-all duration-300 flex-shrink-0
              hover:scale-105 active:scale-95
            "
            title="저장된 녹음"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="text-foreground">
              <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* 확장 토글 버튼 - 이퀄라이저/음파 효과 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          hover:scale-110 active:scale-95 relative
          ${isExpanded
            ? "bg-brand shadow-lg shadow-brand/30"
            : "bg-[#d1d5db] dark:bg-background-overlay hover:bg-[#9ca3af] dark:hover:bg-background-base"
          }
        `}
        title={isExpanded ? "접기" : "펼치기"}
      >
        <div className="flex items-center justify-center gap-[2px] h-[12px]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`
                w-[2px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isExpanded ? "bg-background-surface" : "bg-foreground"}
                ${isExpanded ? "animate-pulse" : ""}
              `}
              style={{
                height: isExpanded
                  ? `${[10, 6, 12, 8][i]}px`
                  : `${[4, 4, 4, 4][i]}px`,
                animationDelay: isExpanded ? `${i * 0.1}s` : "0s",
                animationDuration: "0.8s",
              }}
            />
          ))}
        </div>
      </button>
    </div>
  );
}
