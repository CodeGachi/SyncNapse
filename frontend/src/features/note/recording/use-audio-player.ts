/**
 * Audio Player Hook
 * Manages audio playback for recordings
 */

"use client";

import { useRef, useEffect, useState } from "react";
import { useScriptTranslationStore, useAudioPlayerStore } from "@/stores";
import * as transcriptionApi from "@/lib/api/transcription.api";
import * as audioApi from "@/lib/api/audio.api";
import type { WordWithTime, PageContext } from "@/lib/types";

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
    console.log('[useAudioPlayer] Created shared Audio instance');
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

  // audio Initialize and Event listeners
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
      console.log('[useAudioPlayer] Duration loaded:', audio.duration);
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
      console.error('[useAudioPlayer] ❌ Audio error:', {
        error: audio.error?.code,
        message: audio.error?.message,
        src: audio.src,
      });
    };

    const handleCanPlay = () => {
      console.log('[useAudioPlayer] ✅ Audio can play');
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
      console.log('[useAudioPlayer] Cleanup - event listeners removed (audio continues)');
    };
  }, [timelineEvents]);

  // Recording Select Handler - Load session data and play audio
  // audioRecordingId는 선택적 파라미터로 타임라인 이벤트 로드용
  const handleRecordingSelect = async (sessionIdParam: string, audioRecordingIdParam?: string) => {
    try {
      setIsLoadingSession(true);
      console.log('[useAudioPlayer] Loading recording with sessionId:', sessionIdParam);

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
        console.log('[useAudioPlayer] 🔄 Auto-saving before session change');
        try {
          await scriptStore.saveRevisionCallback(audioStore.currentSessionId, scriptStore.editedSegments);
          scriptStore.resetEdits();
          scriptStore.setEditMode(false);
          console.log('[useAudioPlayer] ✅ Auto-save completed');
        } catch (saveError) {
          console.error('[useAudioPlayer] ❌ Auto-save failed:', saveError);
        }
      }

      const sessionId = sessionIdParam;

      console.log('[useAudioPlayer] Fetching session:', sessionId);

      // Fetch session data from backend
      const sessionData = await transcriptionApi.getSession(sessionId);
      console.log('[useAudioPlayer] Session data loaded:', {
        segments: sessionData.segments?.length || 0,
        fullAudioUrl: sessionData.fullAudioUrl,
        fullAudioKey: sessionData.fullAudioKey,
        duration: sessionData.duration,
        status: sessionData.status,
      });

      // Load segments into ScriptPanel
      if (sessionData.segments && sessionData.segments.length > 0) {
        // 최신 리비전 확인
        let revisionMap: Record<string, string> = {};
        try {
          const revisions = await transcriptionApi.getRevisions(sessionId);
          if (revisions && revisions.length > 0) {
            // 가장 최신 리비전 (version이 가장 높은 것)
            const latestRevision = revisions[0]; // 이미 version desc로 정렬됨
            console.log('[useAudioPlayer] 📝 Latest revision:', {
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
          console.warn('[useAudioPlayer] Failed to load revisions:', revisionError);
        }

        const scriptSegments = sessionData.segments.map((segment) => {
          // 리비전이 있으면 editedText 사용, 없으면 원본 사용
          const editedText = revisionMap[segment.id];
          return {
            id: segment.id,
            timestamp: segment.startTime * 1000, // Convert seconds to milliseconds
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
        console.log('[useAudioPlayer] Loaded', scriptSegments.length, 'segments into ScriptPanel',
          Object.keys(revisionMap).length > 0 ? `(${Object.keys(revisionMap).length} edited)` : '');
      } else {
        console.warn('[useAudioPlayer] No segments found in session');
        setScriptSegments([]);
      }

      // Play audio - Blob URL 방식 우선, 실패시 직접 URL로 fallback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        let audioUrl: string | null = null;

        // fullAudioUrl 직접 사용 (MinIO signed URL)
        if (sessionData.fullAudioUrl) {
          // MinIO URL을 그대로 사용 (이중 인코딩 하지 않음)
          audioUrl = sessionData.fullAudioUrl;
          console.log('[useAudioPlayer] Using audio URL:', audioUrl);
        }

        if (audioUrl) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();

          // WebM 파일의 duration이 헤더에 없는 경우 백엔드 데이터 사용
          const backendDuration = Number(sessionData.duration) || 0;
          if (backendDuration > 0) {
            setDuration(backendDuration);
            console.log('[useAudioPlayer] Using backend duration:', backendDuration);
          }

          // 🔥 pendingSeekTime이 있으면 해당 시간으로 점프
          const store = getAudioPlayerStore();
          if (store.pendingSeekTime !== null) {
            audioRef.current.currentTime = store.pendingSeekTime;
            setCurrentTime(store.pendingSeekTime);
            console.log('[useAudioPlayer] ⏩ Jumped to pending seek time:', store.pendingSeekTime);
            store.setPendingSeekTime(null); // 사용 후 초기화
          }

          // 자동 재생 시도
          try {
            await audioRef.current.play();
            console.log('[useAudioPlayer] ✅ Auto-play started');
          } catch (playError) {
            // 자동 재생 실패 시 (브라우저 정책) - 사용자가 직접 재생 버튼 클릭 필요
            console.warn('[useAudioPlayer] Auto-play blocked, user interaction required:', playError);
          }
        } else {
          console.error('[useAudioPlayer] ❌ No audio URL available');
        }
      }

      setCurrentRecordingId(sessionId);
      setCurrentSessionId(sessionId); // 🔥 전역 스토어에도 저장 (편집 시 리비전 저장용)
      setCurrentAudioRecordingId(audioRecordingIdParam || null);

      console.log('[useAudioPlayer] 🔍 audioRecordingIdParam:', audioRecordingIdParam);

      // 타임라인 이벤트 로드 (audioRecordingId가 있는 경우)
      // 🔥 스토어 직접 접근으로 stale closure 방지
      const store = getAudioPlayerStore();
      if (audioRecordingIdParam) {
        try {
          console.log('[useAudioPlayer] 📥 Loading timeline events for:', audioRecordingIdParam);
          const events = await audioApi.getTimelineEvents(audioRecordingIdParam);
          console.log('[useAudioPlayer] 📤 Saving to store:', events.length, 'events');
          store.setTimelineEvents(events);
          console.log('[useAudioPlayer] ✅ Stored', events.length, 'timeline events');

          // 초기 페이지 컨텍스트 설정 (첫 번째 이벤트)
          if (events.length > 0) {
            const initialContext = audioApi.getPageContextAtTime(events, 0);
            store.setCurrentPageContext(initialContext);
          }
        } catch (timelineError) {
          console.error('[useAudioPlayer] Failed to load timeline events:', timelineError);
          store.clearTimeline();
        }
      } else {
        store.clearTimeline();
      }

    } catch (error) {
      console.error('[useAudioPlayer] Failed to load recording:', error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Play Stop
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
    console.log('[useAudioPlayer] Audio player reset');
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
      console.log('[useAudioPlayer] ⏩ Seeked to:', timeInSeconds, 'seconds');
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
