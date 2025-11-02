/**
 * Audio Player Hook
 * Manages audio playback for recordings
 */

"use client";

import { useRef, useEffect } from "react";
import { useNoteEditorStore } from "@/stores";

export function useAudioPlayer() {
  const {
    isPlaying,
    togglePlay,
    setCurrentTime,
    recordings,
    currentRecordingId,
    selectRecording,
  } = useNoteEditorStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // audio Initialize and Event s너
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(Math.floor(audio.currentTime));
    };

    const handleEnded = () => {
      if (isPlaying) togglePlay();
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isPlaying, setCurrentTime, togglePlay]);

  // Recording Select Handler
  const handleRecordingSelect = (id: number) => {
    const recording = recordings.find(
      (r) => parseInt(r.id, 10) === id || r.id === id.toString()
    );
    if (!recording) return;

    selectRecording(recording.id);

    // audio Play
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = recording.audioUrl;
      audioRef.current.load();
      audioRef.current.play();
      if (!isPlaying) togglePlay();
    }
  };

  // Play Stop
  const handleStopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (isPlaying) togglePlay();
    }
  };

  return {
    audioRef,
    isPlaying,
    togglePlay,
    handleRecordingSelect,
    handleStopPlayback,
  };
}
