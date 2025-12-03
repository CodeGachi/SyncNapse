/**
 * 스크립트 패널 훅
 *
 * 스크립트 세그먼트/워드 클릭, 페이지 컨텍스트 탐색,
 * 오디오 시간 추적 로직을 담당
 */

import { useState, useEffect, useCallback, RefObject } from "react";
import { getPageContextAtTime, type AudioTimelineEvent } from "@/lib/api/services/audio.api";
import type { PageContext, WordWithTime } from "@/lib/types";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useScriptPanel");

export interface UseScriptPanelProps {
  /** 오디오 요소 ref */
  audioRef?: RefObject<HTMLAudioElement>;
  /** 타임라인 이벤트 목록 */
  timelineEvents: AudioTimelineEvent[];
  /** 페이지 컨텍스트 클릭 콜백 */
  onPageContextClick?: (context: PageContext) => void;
  /** 파일 목록 (backendId 매핑용) */
  files?: { id: string; name: string; backendId?: string }[];
}

export interface UseScriptPanelReturn {
  /** 현재 오디오 재생 시간 */
  currentTime: number;
  /** 세그먼트 클릭 핸들러 */
  handleSegmentClick: (timestamp: number) => void;
  /** 워드 클릭 핸들러 */
  handleWordClick: (startTime: number, e: React.MouseEvent) => void;
  /** 페이지 배지 클릭 핸들러 */
  handlePageBadgeClick: (context: PageContext, e: React.MouseEvent) => void;
  /** 현재 재생 중인 워드 찾기 */
  getCurrentWord: (words: WordWithTime[]) => WordWithTime | null;
  /** 세그먼트 시간에 해당하는 페이지 컨텍스트 가져오기 */
  getSegmentPageContext: (timestampMs: number) => PageContext | null;
  /** backendId로 파일 이름 가져오기 */
  getFileNameByBackendId: (fileId: string | undefined) => string | null;
}

/**
 * 스크립트 패널 훅
 */
export function useScriptPanel({
  audioRef,
  timelineEvents,
  onPageContextClick,
  files = [],
}: UseScriptPanelProps): UseScriptPanelReturn {
  // 현재 오디오 재생 시간
  const [currentTime, setCurrentTime] = useState(0);

  // 오디오 시간 업데이트 추적
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      log.debug("현재 재생 시간:", audio.currentTime);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioRef]);

  /**
   * 세그먼트 클릭 핸들러 - 해당 시간으로 이동 및 페이지 탐색
   */
  const handleSegmentClick = useCallback(
    (timestamp: number) => {
      const timeInSeconds = timestamp / 1000;
      log.debug("세그먼트 클릭:", {
        timestampMs: timestamp,
        timeInSeconds,
        timelineEventsCount: timelineEvents.length,
        hasOnPageContextClick: !!onPageContextClick,
      });

      if (audioRef?.current) {
        log.debug("오디오 시간 이동:", timeInSeconds, "초");
        audioRef.current.currentTime = timeInSeconds;
      }

      // 해당 시간의 페이지 컨텍스트로 이동
      const pageContext = getPageContextAtTime(timelineEvents, timeInSeconds);
      log.debug("타임라인에서 페이지 컨텍스트:", pageContext);
      if (pageContext && onPageContextClick) {
        log.debug("onPageContextClick 호출:", pageContext);
        onPageContextClick(pageContext);
      } else {
        log.debug("페이지 컨텍스트 없음 또는 콜백 없음:", {
          pageContext,
          hasCallback: !!onPageContextClick,
        });
      }
    },
    [audioRef, timelineEvents, onPageContextClick]
  );

  /**
   * 워드 클릭 핸들러 - 해당 워드 시간으로 이동
   */
  const handleWordClick = useCallback(
    (startTime: number, e: React.MouseEvent) => {
      e.stopPropagation();
      log.debug("워드 클릭:", {
        startTime,
        timelineEventsCount: timelineEvents.length,
        hasOnPageContextClick: !!onPageContextClick,
      });

      if (audioRef?.current) {
        log.debug("오디오 시간 이동 (워드):", startTime, "초");
        audioRef.current.currentTime = startTime;
      }

      // 해당 시간의 페이지 컨텍스트로 이동
      const pageContext = getPageContextAtTime(timelineEvents, startTime);
      log.debug("타임라인에서 페이지 컨텍스트:", pageContext);
      if (pageContext && onPageContextClick) {
        log.debug("onPageContextClick 호출:", pageContext);
        onPageContextClick(pageContext);
      } else {
        log.debug("페이지 컨텍스트 없음 또는 콜백 없음:", {
          pageContext,
          hasCallback: !!onPageContextClick,
        });
      }
    },
    [audioRef, timelineEvents, onPageContextClick]
  );

  /**
   * 페이지 배지 클릭 핸들러
   */
  const handlePageBadgeClick = useCallback(
    (context: PageContext, e: React.MouseEvent) => {
      e.stopPropagation();
      log.debug("페이지 배지 클릭:", context);
      if (onPageContextClick) {
        onPageContextClick(context);
      } else {
        log.warn("onPageContextClick이 제공되지 않음!");
      }
    },
    [onPageContextClick]
  );

  /**
   * 현재 재생 중인 워드 찾기
   */
  const getCurrentWord = useCallback(
    (words: WordWithTime[]): WordWithTime | null => {
      return (
        words.find((word, index, arr) => {
          const nextWord = arr[index + 1];
          return (
            currentTime >= word.startTime &&
            (!nextWord || currentTime < nextWord.startTime)
          );
        }) || null
      );
    },
    [currentTime]
  );

  /**
   * 세그먼트 시간에 해당하는 페이지 컨텍스트 가져오기
   */
  const getSegmentPageContext = useCallback(
    (timestampMs: number): PageContext | null => {
      if (!timelineEvents || timelineEvents.length === 0) return null;
      const timeInSeconds = timestampMs / 1000;
      return getPageContextAtTime(timelineEvents, timeInSeconds);
    },
    [timelineEvents]
  );

  /**
   * backendId로 파일 이름 가져오기
   */
  const getFileNameByBackendId = useCallback(
    (fileId: string | undefined): string | null => {
      if (!fileId) return null;
      const file = files.find((f) => f.backendId === fileId);
      if (!file) return null;
      // 파일명이 너무 길면 자르기
      const name = file.name;
      if (name.length > 15) {
        return name.slice(0, 12) + "...";
      }
      return name;
    },
    [files]
  );

  return {
    currentTime,
    handleSegmentClick,
    handleWordClick,
    handlePageBadgeClick,
    getCurrentWord,
    getSegmentPageContext,
    getFileNameByBackendId,
  };
}
