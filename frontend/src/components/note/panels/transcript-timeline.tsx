/**
 * Transcript Timeline Component
 * Visualizes transcript segments on a timeline with audio playback progress
 */

"use client";

import { useRef, useEffect, useState } from "react";
import type { ScriptSegment } from "@/lib/types";

interface TranscriptTimelineProps {
  segments: ScriptSegment[];
  audioRef: React.RefObject<HTMLAudioElement>;
  activeSegmentId?: string | null;
  onSeek: (time: number) => void;
  className?: string;
}

export function TranscriptTimeline({
  segments,
  audioRef,
  activeSegmentId,
  onSeek,
  className = "",
}: TranscriptTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Update duration and current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      // Validate duration to prevent invalid array lengths
      const audioDuration = audio.duration;
      if (isNaN(audioDuration) || !isFinite(audioDuration) || audioDuration < 0) {
        setDuration(0);
      } else {
        setDuration(audioDuration);
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);

    // Set initial duration if already loaded
    if (audio.duration) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [audioRef, isDragging]);

  // Format time to MM:SS
  const formatTime = (seconds: number): string => {
    // Validate input
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Estimate duration from segments if audio duration is not available
  // Use actual segment max time + small buffer for last segment duration (2-3 seconds)
  const estimatedDuration = segments.length > 0 
    ? Math.max(...segments.map(s => (s.timestamp || 0) / 1000)) + 3 // Add 3s buffer for last segment
    : 0;
  
  // Prefer actual audio duration over estimated duration from segments
  const effectiveDuration = duration > 0 ? duration : estimatedDuration;
  
  console.log('[TranscriptTimeline] Duration calculation:', {
    audioDuration: duration,
    estimatedDuration,
    effectiveDuration,
    segmentCount: segments.length,
    maxSegmentTime: segments.length > 0 ? Math.max(...segments.map(s => (s.timestamp || 0) / 1000)) : 0,
  });

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || effectiveDuration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * effectiveDuration;

    // Validate calculated time
    if (!isFinite(clickedTime) || clickedTime < 0) {
      console.warn('[TranscriptTimeline] Invalid clicked time:', clickedTime);
      return;
    }

    onSeek(clickedTime);
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleTimelineClick(e);
  };

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !timelineRef.current || effectiveDuration === 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const newTime = (x / rect.width) * effectiveDuration;

      // Validate calculated time
      if (isFinite(newTime) && newTime >= 0) {
        setCurrentTime(newTime);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Validate currentTime before seeking
        if (isFinite(currentTime) && currentTime >= 0) {
          onSeek(currentTime);
        }
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, effectiveDuration, currentTime, onSeek]);

  // Calculate segment position and width
  const getSegmentStyle = (segment: ScriptSegment) => {
    const durationToUse = effectiveDuration || duration;
    if (durationToUse === 0 || !isFinite(durationToUse)) return { left: "0%", width: "0%" };

    // Validate segment timestamp (in milliseconds, need to convert to seconds)
    const timestampMs = segment.timestamp || 0;
    if (!isFinite(timestampMs) || timestampMs < 0) return { left: "0%", width: "0%" };
    
    const timestamp = timestampMs / 1000; // Convert milliseconds to seconds

    const left = Math.max(0, Math.min(100, (timestamp / durationToUse) * 100));
    // Assume each segment lasts 5 seconds or until next segment
    const segmentDuration = 5;
    const width = (segmentDuration / durationToUse) * 100;

    return {
      left: `${left}%`,
      width: `${Math.min(width, 100 - left)}%`,
    };
  };

  if (effectiveDuration === 0) {
    return (
      <div className={`bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-4 ${className}`}>
        <div className="text-center text-gray-400 text-sm py-4">
          오디오를 로드하면 타임라인이 표시됩니다
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-white text-sm font-semibold">Transcript Timeline</h4>
        <div className="text-gray-400 text-xs">
          {formatTime(currentTime)} / {formatTime(effectiveDuration)}
        </div>
      </div>

      {/* Timeline */}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        className="relative w-full h-16 bg-[#1e1e1e] rounded-lg cursor-pointer overflow-hidden"
      >
        {/* Segment markers */}
        {segments.map((segment) => {
          const isActive = activeSegmentId === segment.id;
          const style = getSegmentStyle(segment);

          return (
            <div
              key={segment.id}
              className={`absolute top-0 h-full transition-all ${
                isActive ? "bg-blue-500 opacity-80" : "bg-blue-600 opacity-40 hover:opacity-60"
              }`}
              style={style}
              title={`${formatTime((segment.timestamp || 0) / 1000)}: ${(segment.originalText || '').substring(0, 50)}...`}
            />
          );
        })}

        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-full bg-blue-400 opacity-20 pointer-events-none"
          style={{ width: `${effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0}%` }}
        />

        {/* Current time indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-blue-300 pointer-events-none"
          style={{ left: `${effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0}%` }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-300 rounded-full border-2 border-white" />
        </div>

        {/* Time markers (every minute) */}
        {effectiveDuration > 0 && Array.from({ length: Math.min(Math.ceil(effectiveDuration / 60), 1000) }).map((_, i) => {
          const time = (i + 1) * 60;
          if (time >= effectiveDuration) return null;

          return (
            <div
              key={i}
              className="absolute top-0 h-full border-l border-gray-600 pointer-events-none"
              style={{ left: `${(time / effectiveDuration) * 100}%` }}
            >
              <span className="absolute top-full mt-1 transform -translate-x-1/2 text-xs text-gray-500">
                {formatTime(time)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 opacity-40 rounded" />
          <span>자막 세그먼트</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 opacity-80 rounded" />
          <span>현재 세그먼트</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-300 rounded-full" />
          <span>재생 위치</span>
        </div>
      </div>
    </div>
  );
}

