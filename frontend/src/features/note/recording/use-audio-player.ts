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
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
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
        audioUrl: sessionData.fullAudioUrl,
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
      
      if (!audioSource) {
        console.error('[useAudioPlayer] No audio URL found');
        // Try using backend proxy endpoint
        const proxyUrl = `/api/transcription/sessions/${sessionId}/audio`;
        console.log('[useAudioPlayer] Using proxy URL:', proxyUrl);
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0; // Reset to beginning
          audioRef.current.src = proxyUrl;
          audioRef.current.load();
          
          // Wait for metadata to load before playing
          audioRef.current.onloadedmetadata = async () => {
            try {
              await audioRef.current!.play();
              if (!isPlaying) togglePlay();
              console.log('[useAudioPlayer] ✅ Auto-play started');
            } catch (playError) {
              console.error('[useAudioPlayer] Auto-play failed:', playError);
            }
          };
        }
      } else {
        console.log('[useAudioPlayer] Playing audio from:', audioSource);
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0; // Reset to beginning
          audioRef.current.src = audioSource;
          audioRef.current.load();
          
          // Wait for metadata to load before playing
          audioRef.current.onloadedmetadata = async () => {
            try {
              await audioRef.current!.play();
              if (!isPlaying) togglePlay();
              console.log('[useAudioPlayer] ✅ Auto-play started');
            } catch (playError) {
              console.error('[useAudioPlayer] Auto-play failed:', playError);
            }
          };
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
    }
  };

  return {
    audioRef,
    isPlaying,
    togglePlay,
    handleRecordingSelect,
    handleStopPlayback,
    isLoadingSession,
    currentRecordingId,
  };
}
