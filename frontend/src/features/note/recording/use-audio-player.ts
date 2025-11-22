/**
 * Audio Player Hook
 * Manages audio playback for recordings
 */

"use client";

import { useRef, useEffect, useState } from "react";
import { useScriptTranslationStore } from "@/stores";
import * as transcriptionApi from "@/lib/api/transcription.api";
import type { WordWithTime } from "@/lib/types";

export function useAudioPlayer() {
  const { setScriptSegments } = useScriptTranslationStore();

  // 오디오 플레이어 로컬 state (Zustand에서 제거됨)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play/Pause 토글
  const togglePlay = () => setIsPlaying((prev) => !prev);

  // audio Initialize and Event listeners
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
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
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  // Recording Select Handler - Load session data and play audio
  const handleRecordingSelect = async (sessionIdParam: string) => {
    try {
      setIsLoadingSession(true);
      console.log('[useAudioPlayer] Loading recording with sessionId:', sessionIdParam);

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
        const scriptSegments = sessionData.segments.map((segment) => ({
          id: segment.id,
          timestamp: segment.startTime * 1000, // Convert seconds to milliseconds
          originalText: segment.text,
          translatedText: undefined,
          speaker: undefined,
          words: segment.words?.map((word: any) => ({
            word: word.word,
            startTime: word.startTime,
            confidence: word.confidence || 1.0,
            wordIndex: word.wordIndex,
          })) as WordWithTime[] || undefined,
          isPartial: false,
        }));

        setScriptSegments(scriptSegments);
        console.log('[useAudioPlayer] Loaded', scriptSegments.length, 'segments into ScriptPanel');
      } else {
        console.warn('[useAudioPlayer] No segments found in session');
        setScriptSegments([]);
      }

      // Play audio
      const audioSource = sessionData.fullAudioUrl;
      const audioUrl = audioSource || `/api/transcription/sessions/${sessionId}/audio`;

      console.log('[useAudioPlayer] Playing audio from:', audioUrl);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = audioUrl;
        audioRef.current.load();

        // duration은 useEffect의 loadedmetadata 이벤트 리스너에서 자동 업데이트됨
        // 자동 재생 시도
        try {
          await audioRef.current.play();
          console.log('[useAudioPlayer] ✅ Auto-play started');
        } catch (playError) {
          // 자동 재생 실패 시 (브라우저 정책) - 사용자가 직접 재생 버튼 클릭 필요
          console.warn('[useAudioPlayer] Auto-play blocked, user interaction required:', playError);
        }
      }

      setCurrentRecordingId(sessionId);

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
    console.log('[useAudioPlayer] Audio player reset');
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
  };
}
