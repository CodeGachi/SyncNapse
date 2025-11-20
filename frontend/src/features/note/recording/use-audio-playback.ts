/**
 * Audio Playback Hook
 * Manages audio playback controls and script segment synchronization
 * Separated from RightSidePanel for better separation of concerns
 */

"use client";

import { useEffect, useState, RefObject } from "react";
import type { ScriptSegment } from "@/lib/types";

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

  // Track active transcript segment based on audio playback time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || scriptSegments.length === 0) return;

    const handleTimeUpdate = () => {
      const audioCurrentTime = audio.currentTime; // in seconds

      // Update currentTime state
      setCurrentTime(audioCurrentTime);

      // Find the active segment - segment.timestamp is in milliseconds
      const activeSegment = scriptSegments.find((segment) => {
        const segmentStartTime = (segment.timestamp || 0) / 1000; // Convert ms to seconds
        const segmentEndTime = segmentStartTime + 5; // 5 second window
        return (
          audioCurrentTime >= segmentStartTime &&
          audioCurrentTime < segmentEndTime
        );
      });

      if (activeSegment) {
        console.log("[useAudioPlayback] Active segment:", {
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

  // Audio playback controls (for saved recordings)
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

  // Handle timeline seek
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      // Validate time value
      if (!isFinite(time) || time < 0) {
        console.warn("[useAudioPlayback] Invalid seek time:", time);
        return;
      }

      // Clamp time to valid range
      const maxTime = audioRef.current.duration || 0;
      const validTime = Math.max(0, Math.min(time, maxTime));

      audioRef.current.currentTime = validTime;
      console.log("[useAudioPlayback] Seek to:", validTime);
    }
  };

  // Format time helper
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
