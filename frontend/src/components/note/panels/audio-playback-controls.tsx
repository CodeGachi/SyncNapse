/**
 * Audio Playback Controls
 *
 * 오디오 재생/일시정지/정지 컨트롤과 시간 표시
 * ScriptPanel 아래 타임라인과 함께 표시되는 재생 컨트롤
 */

"use client";

import { RefObject } from "react";

interface AudioPlaybackControlsProps {
  audioRef: RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  onPlayToggle: () => void;
  onStop: () => void;
}

export function AudioPlaybackControls({
  audioRef,
  isPlaying,
  currentTime,
  onPlayToggle,
  onStop,
}: AudioPlaybackControlsProps) {
  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!audioRef.current || !audioRef.current.src) {
    return null;
  }

  return (
    <div className="mt-3 bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 재생/일시정지 버튼 */}
          <button
            onClick={onPlayToggle}
            className="w-10 h-10 bg-[#444444] rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            aria-label={isPlaying ? "일시정지" : "재생"}
          >
            {isPlaying ? (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <rect x="0" y="0" width="4" height="14" />
                <rect x="8" y="0" width="4" height="14" />
              </svg>
            ) : (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                <path d="M0 0L12 7L0 14V0Z" />
              </svg>
            )}
          </button>

          {/* 정지 버튼 */}
          <button
            onClick={onStop}
            className="w-10 h-10 bg-[#444444] rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="정지"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
              <rect width="10" height="10" />
            </svg>
          </button>

          {/* 시간 표시 */}
          <div className="text-white text-sm">
            {formatTime(currentTime)} / {formatTime(audioRef.current.duration || 0)}
          </div>
        </div>

        <div className="text-gray-400 text-xs">
          오디오 재생 중
        </div>
      </div>
    </div>
  );
}
