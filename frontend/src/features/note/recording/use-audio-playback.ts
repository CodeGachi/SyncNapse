/**
 * 오디오 재생 훅
 * 오디오 재생 컨트롤 및 스크립트 세그먼트 동기화 관리
 * 관심사 분리를 위해 RightSidePanel에서 분리됨
 */

"use client";

import { useEffect, useState, RefObject } from "react";
import type { ScriptSegment } from "@/lib/types";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("AudioPlayback");

interface UseAudioPlaybackProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  scriptSegments: ScriptSegment[];
  isPlaying: boolean;
  togglePlay: () => void;
}

export function useAudioPlayback({
  audioRef,
  scriptSegments,
  isPlaying,
  togglePlay,
}: UseAudioPlaybackProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  // 오디오 재생 시간 기반 활성 트랜스크립트 세그먼트 추적
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || scriptSegments.length === 0) return;

    const handleTimeUpdate = () => {
      const audioCurrentTime = audio.currentTime; // 초 단위

      // currentTime 상태 업데이트
      setCurrentTime(audioCurrentTime);

      // 활성 세그먼트 찾기 - segment.timestamp는 밀리초 단위
      const activeSegment = scriptSegments.find((segment) => {
        const segmentStartTime = (segment.timestamp || 0) / 1000; // ms를 초로 변환
        const segmentEndTime = segmentStartTime + 5; // 5초 윈도우
        return (
          audioCurrentTime >= segmentStartTime &&
          audioCurrentTime < segmentEndTime
        );
      });

      if (activeSegment) {
        log.debug("활성 세그먼트:", {
          id: activeSegment.id,
          text: activeSegment.originalText?.substring(0, 30),
          segmentTime: ((activeSegment.timestamp || 0) / 1000).toFixed(2) + "s",
          currentTime: audioCurrentTime.toFixed(2) + "s",
        });
      }

      setActiveSegmentId(activeSegment?.id || null);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioRef, scriptSegments]);

  // 오디오 재생 컨트롤 (저장된 녹음용)
  const handleAudioPlayToggle = () => {
    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      togglePlay();
    }
  };

  const handleAudioStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (isPlaying) togglePlay();
    }
  };

  // 타임라인 탐색 처리
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      // 시간 값 검증
      if (!isFinite(time) || time < 0) {
        log.warn("유효하지 않은 탐색 시간:", time);
        return;
      }

      // 유효 범위로 시간 값 제한
      const maxTime = audioRef.current.duration || 0;
      const validTime = Math.max(0, Math.min(time, maxTime));

      audioRef.current.currentTime = validTime;
      log.debug("탐색:", validTime);
    }
  };

  // 시간 포맷 헬퍼
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return {
    currentTime,
    activeSegmentId,
    handleAudioPlayToggle,
    handleAudioStop,
    handleSeek,
    formatTime,
  };
}
