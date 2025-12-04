/**
 * 오디오 플레이어 훅
 * 녹음 오디오 재생 관리
 */

"use client";

import { useRef, useEffect, useState } from "react";
import { useScriptTranslationStore, useAudioPlayerStore } from "@/stores";
import * as transcriptionApi from "@/lib/api/services/transcription.api";
import * as audioApi from "@/lib/api/services/audio.api";
import type { WordWithTime, PageContext } from "@/lib/types";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("AudioPlayer");

// 🔥 스토어 직접 접근 (stale closure 방지)
const getAudioPlayerStore = () => useAudioPlayerStore.getState();
const getScriptTranslationStore = () => useScriptTranslationStore.getState();

// 🔥 싱글톤 Audio 인스턴스 - 여러 컴포넌트에서 공유
let sharedAudioInstance: HTMLAudioElement | null = null;

function getSharedAudio(): HTMLAudioElement {
  if (typeof window === 'undefined') {
    // SSR 환경에서는 null 반환 방지
    return null as unknown as HTMLAudioElement;
  }
  if (!sharedAudioInstance) {
    sharedAudioInstance = new Audio();
    log.debug("공유 Audio 인스턴스 생성됨");
  }
  return sharedAudioInstance;
}

export function useAudioPlayer() {
  const { setScriptSegments } = useScriptTranslationStore();

  // 🔥 타임라인 이벤트는 전역 스토어 사용 (여러 컴포넌트에서 공유)
  const {
    timelineEvents,
    currentPageContext,
    currentSessionId,
    pendingSeekTime,
    setTimelineEvents,
    setCurrentPageContext,
    setCurrentSessionId,
    clearTimeline,
    setPendingSeekTime,
  } = useAudioPlayerStore();

  // 오디오 플레이어 로컬 state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [currentAudioRecordingId, setCurrentAudioRecordingId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 🔥 싱글톤 Audio 인스턴스 사용
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play/Pause 토글
  const togglePlay = () => setIsPlaying((prev) => !prev);

  // 오디오 초기화 및 이벤트 리스너
  useEffect(() => {
    // 🔥 싱글톤 Audio 인스턴스 사용
    audioRef.current = getSharedAudio();

    if (!audioRef.current) return; // SSR 환경

    const audio = audioRef.current;

    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      // 현재 재생 시간에 해당하는 페이지 컨텍스트 계산
      const pageContext = audioApi.getPageContextAtTime(timelineEvents, time);
      setCurrentPageContext(pageContext);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      log.debug("재생 시간 로드됨:", audio.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      const audio = e.target as HTMLAudioElement;
      // 빈 src로 인한 에러는 무시 (초기화 시 정상적인 상태)
      if (!audio.src || audio.src === window.location.href) {
        return;
      }
      log.error("오디오 에러:", {
        error: audio.error?.code,
        message: audio.error?.message,
        src: audio.src,
      });
    };

    const handleCanPlay = () => {
      log.debug("오디오 재생 가능");
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      // 🔥 싱글톤이므로 이벤트 리스너만 제거, 오디오는 정지하지 않음
      // (다른 컴포넌트에서 계속 사용 중일 수 있음)
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      log.debug("정리 - 이벤트 리스너 제거됨 (오디오 계속 재생)");
    };
  }, [timelineEvents]);

  // 녹음 선택 핸들러 - 세션 데이터 로드 및 오디오 재생
  // audioRecordingId는 선택적 파라미터로 타임라인 이벤트 로드용
  const handleRecordingSelect = async (sessionIdParam: string, audioRecordingIdParam?: string) => {
    try {
      setIsLoadingSession(true);
      log.debug("녹음 로드 중, sessionId:", sessionIdParam);

      // 🔥 다른 세션으로 변경하기 전에 현재 편집 내용 자동 저장
      const scriptStore = getScriptTranslationStore();
      const audioStore = getAudioPlayerStore();
      if (
        scriptStore.isEditMode &&
        audioStore.currentSessionId &&
        audioStore.currentSessionId !== sessionIdParam &&
        Object.keys(scriptStore.editedSegments).length > 0 &&
        scriptStore.saveRevisionCallback
      ) {
        log.debug("세션 변경 전 자동 저장 중");
        try {
          await scriptStore.saveRevisionCallback(audioStore.currentSessionId, scriptStore.editedSegments);
          scriptStore.resetEdits();
          scriptStore.setEditMode(false);
          log.debug("자동 저장 완료");
        } catch (saveError) {
          log.error("자동 저장 실패:", saveError);
        }
      }

      const sessionId = sessionIdParam;

      log.debug("세션 가져오는 중:", sessionId);

      // 백엔드에서 세션 데이터 가져오기
      const sessionData = await transcriptionApi.getSession(sessionId);
      log.debug("세션 데이터 로드됨:", {
        segments: sessionData.segments?.length || 0,
        fullAudioUrl: sessionData.fullAudioUrl,
        fullAudioKey: sessionData.fullAudioKey,
        duration: sessionData.duration,
        status: sessionData.status,
      });

      // ScriptPanel에 세그먼트 로드
      if (sessionData.segments && sessionData.segments.length > 0) {
        // 최신 리비전 확인
        let revisionMap: Record<string, string> = {};
        try {
          const revisions = await transcriptionApi.getRevisions(sessionId);
          if (revisions && revisions.length > 0) {
            // 가장 최신 리비전 (version이 가장 높은 것)
            const latestRevision = revisions[0]; // 이미 version desc로 정렬됨
            log.debug("최신 리비전:", {
              version: latestRevision.version,
              segmentsCount: latestRevision.content?.segments?.length || 0,
            });

            // 리비전 내용을 맵으로 변환
            if (latestRevision.content?.segments) {
              latestRevision.content.segments.forEach((seg: any) => {
                revisionMap[seg.id] = seg.editedText;
              });
            }
          }
        } catch (revisionError) {
          log.warn("리비전 로드 실패:", revisionError);
        }

        const scriptSegments = sessionData.segments.map((segment) => {
          // 리비전이 있으면 editedText 사용, 없으면 원본 사용
          const editedText = revisionMap[segment.id];
          return {
            id: segment.id,
            timestamp: segment.startTime * 1000, // 초를 밀리초로 변환
            originalText: editedText || segment.text, // 리비전 적용
            translatedText: undefined,
            speaker: undefined,
            words: editedText ? undefined : segment.words?.map((word: any) => ({
              word: word.word,
              startTime: word.startTime,
              confidence: word.confidence || 1.0,
              wordIndex: word.wordIndex,
            })) as WordWithTime[] || undefined, // 편집된 경우 words는 의미없음
            isPartial: false,
          };
        });

        setScriptSegments(scriptSegments);
        log.debug("ScriptPanel에 세그먼트 로드됨:", scriptSegments.length,
          Object.keys(revisionMap).length > 0 ? `(${Object.keys(revisionMap).length}개 편집됨)` : "");
      } else {
        log.warn("세션에 세그먼트 없음");
        setScriptSegments([]);
      }

      // 오디오 재생 - 백엔드 프록시를 통해 복호화된 오디오 가져오기
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        let audioUrl: string | null = null;

        // 1. 백엔드 프록시를 통해 복호화된 오디오 가져오기 (암호화된 파일 지원)
        try {
          audioUrl = await transcriptionApi.getAudioBlobUrl(sessionId);
          log.debug("백엔드 프록시를 통해 Blob URL 생성됨:", audioUrl);
        } catch (proxyError) {
          log.warn("백엔드 프록시 오디오 로드 실패:", proxyError);
          
          // 2. 실패 시 fullAudioUrl 직접 사용 (비암호화 파일 fallback)
          if (sessionData.fullAudioUrl) {
            audioUrl = sessionData.fullAudioUrl.replace(
              /(syncnapse-files(?:-prod)?)\/(syncnapse-files(?:-prod)?)/g,
              "$1"
            );
            log.debug("MinIO 직접 URL로 fallback:", audioUrl);
          }
        }

        if (audioUrl) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();

          // WebM 파일의 duration이 헤더에 없는 경우 백엔드 데이터 사용
          const backendDuration = Number(sessionData.duration) || 0;
          if (backendDuration > 0) {
            setDuration(backendDuration);
            log.debug("백엔드 재생 시간 사용:", backendDuration);
          }

          // 🔥 pendingSeekTime이 있으면 해당 시간으로 점프
          const store = getAudioPlayerStore();
          if (store.pendingSeekTime !== null) {
            audioRef.current.currentTime = store.pendingSeekTime;
            setCurrentTime(store.pendingSeekTime);
            log.debug("대기 중인 탐색 시간으로 점프:", store.pendingSeekTime);
            store.setPendingSeekTime(null); // 사용 후 초기화
          }

          // 자동 재생 시도
          try {
            await audioRef.current.play();
            log.debug("자동 재생 시작됨");
          } catch (playError) {
            // 자동 재생 실패 시 (브라우저 정책) - 사용자가 직접 재생 버튼 클릭 필요
            log.warn("자동 재생 차단됨, 사용자 상호작용 필요:", playError);
          }
        } else {
          log.error("사용 가능한 오디오 URL 없음");
        }
      }

      setCurrentRecordingId(sessionId);
      setCurrentSessionId(sessionId); // 🔥 전역 스토어에도 저장 (편집 시 리비전 저장용)
      setCurrentAudioRecordingId(audioRecordingIdParam || null);

      log.debug("audioRecordingIdParam:", audioRecordingIdParam);

      // 타임라인 이벤트 로드 (audioRecordingId가 있는 경우)
      // 🔥 스토어 직접 접근으로 stale closure 방지
      const store = getAudioPlayerStore();
      if (audioRecordingIdParam) {
        try {
          log.debug("타임라인 이벤트 로드 중:", audioRecordingIdParam);
          const events = await audioApi.getTimelineEvents(audioRecordingIdParam);
          log.debug("스토어에 저장:", events.length, "개 이벤트");
          store.setTimelineEvents(events);
          log.debug("타임라인 이벤트 저장 완료:", events.length, "개");

          // 초기 페이지 컨텍스트 설정 (첫 번째 이벤트)
          if (events.length > 0) {
            const initialContext = audioApi.getPageContextAtTime(events, 0);
            store.setCurrentPageContext(initialContext);
          }
        } catch (timelineError) {
          log.error("타임라인 이벤트 로드 실패:", timelineError);
          store.clearTimeline();
        }
      } else {
        store.clearTimeline();
      }

    } catch (error) {
      log.error("녹음 로드 실패:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // 재생 중지
  const handleStopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // 오디오 플레이어 초기화 (새 녹음 시작 전 호출)
  const resetAudioPlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentRecordingId(null);
    setCurrentAudioRecordingId(null);
    getAudioPlayerStore().clearTimeline(); // 🔥 스토어 직접 접근
    log.debug("오디오 플레이어 초기화됨");
  };

  // 특정 시간의 페이지 컨텍스트 조회 (외부에서 사용 가능)
  const getPageContextAtTime = (time: number): PageContext | null => {
    return audioApi.getPageContextAtTime(timelineEvents, time);
  };

  // 특정 시간으로 점프
  const seekTo = (timeInSeconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeInSeconds;
      setCurrentTime(timeInSeconds);
      log.debug("탐색:", timeInSeconds, "초");
    }
  };

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    handleRecordingSelect,
    handleStopPlayback,
    resetAudioPlayer,
    isLoadingSession,
    currentRecordingId,
    // 타임라인 관련
    currentAudioRecordingId,
    timelineEvents,
    currentPageContext,
    getPageContextAtTime,
    seekTo,
  };
}
