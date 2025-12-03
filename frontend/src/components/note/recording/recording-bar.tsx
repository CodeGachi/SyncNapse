/**
 * 녹음바 UI 컴포넌트
 * - 컴팩트: 녹음, 저장, 시간
 * - 확장: + 프로그레스, 재생, 뒤로, 목록
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

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
        flex items-center bg-[#2a2a2a] rounded-full px-3 py-1.5
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isExpanded ? "gap-3 pr-2" : "gap-2"}
      `}
    >
      {/* 녹음 버튼 */}
      <button
        onClick={onPlayToggle}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
          transition-all duration-300 flex-shrink-0 bg-[#444444] hover:bg-[#555555]
          hover:scale-105 active:scale-95
        `}
        title={isRecording ? "녹음 일시정지/재개" : "녹음 시작"}
      >
        <Image
          src="/record.svg"
          alt={isRecording ? "Recording" : "Record"}
          width={14}
          height={14}
          className="transition-all duration-300"
          style={{ filter: !isRecording
            ? "none"
            : isPlaying
              ? "brightness(0) saturate(100%) invert(36%) sepia(68%) saturate(1000%) hue-rotate(327deg) brightness(95%) contrast(90%)"
              : "brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg)"
          }}
        />
      </button>

      {/* 저장 버튼 */}
      <button
        onClick={isRecording && onSave ? onSave : undefined}
        disabled={!isRecording}
        className={`
          w-8 h-8 bg-[#444444] rounded-full flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${isRecording ? "cursor-pointer hover:bg-[#555555] hover:scale-105 active:scale-95" : "opacity-40 cursor-not-allowed"}
        `}
        title="저장"
      >
        <Image
          src="/iconstack.io - (Player Stop).svg"
          alt="Save"
          width={18}
          height={18}
        />
      </button>

      {/* 시간 */}
      <div className="px-1 flex-shrink-0 min-w-[45px]">
        <p className="text-[12px] font-mono whitespace-nowrap text-[#888888] transition-colors duration-300">
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
            w-[40px] h-[4px] flex-shrink-0 relative bg-[#444444] rounded-full
            transition-all duration-300
            ${isPlaybackMode ? "cursor-pointer hover:h-[6px]" : "cursor-not-allowed opacity-50"}
          `}
          onMouseDown={handleMouseDown}
        >
          {isPlaybackMode && duration > 0 && (
            <div
              className={`absolute left-0 top-0 h-full bg-[#AFC02B] rounded-full ${isDragging ? "" : "transition-all duration-150"}`}
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
            w-8 h-8 bg-[#444444] rounded-full flex items-center justify-center flex-shrink-0
            transition-all duration-300
            ${isPlaybackMode ? "cursor-pointer hover:bg-[#555555] hover:scale-105 active:scale-95" : "opacity-40 cursor-not-allowed"}
          `}
          title={isPlaybackMode ? (isPlaying ? "일시정지" : "재생") : "녹음본 선택 필요"}
        >
          {isPlaybackMode && isPlaying ? (
            <svg width="10" height="12" viewBox="0 0 12 14" fill="white">
              <rect x="0" y="0" width="4" height="14" fill="white" />
              <rect x="8" y="0" width="4" height="14" fill="white" />
            </svg>
          ) : (
            <Image
              src="/iconstack.io - (Player Play).svg"
              alt="Play"
              width={16}
              height={16}
              className={!isPlaybackMode ? "opacity-50" : ""}
            />
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
          <Image
            src="/iconstack.io - (Player Skip Back).svg"
            alt="Skip Back"
            width={16}
            height={16}
          />
        </button>

        {/* 목록 */}
        {onToggleRecordingList && (
          <button
            onClick={onToggleRecordingList}
            className="
              flex items-center justify-center w-8 h-8 rounded-full
              bg-[#444444] hover:bg-[#555555] cursor-pointer
              transition-all duration-300 flex-shrink-0
              hover:scale-105 active:scale-95
            "
            title="저장된 녹음"
          >
            <Image src="/menu.svg" alt="List" width={14} height={14} />
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
            ? "bg-[#AFC02B] shadow-lg shadow-[#AFC02B]/30"
            : "bg-[#444444] hover:bg-[#555555]"
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
                ${isExpanded ? "bg-[#1e1e1e]" : "bg-white"}
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
