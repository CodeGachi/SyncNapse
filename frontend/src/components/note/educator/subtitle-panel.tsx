/**
 * Subtitle Panel Component
 * 
 * Displays transcription segments (subtitles) for selected audio
 * - Shows timestamp and text
 * - Syncs with audio playback
 * - Fetches from backend MinIO storage
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Subtitles, Download } from "lucide-react";

interface SubtitleSegment {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  confidence?: number;
  language?: string;
}

interface SubtitlePanelProps {
  audioId: string | null;
  noteId: string;
}

export function SubtitlePanel({ audioId, noteId }: SubtitlePanelProps) {
  const [segments, setSegments] = useState<SubtitleSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load subtitles when audio is selected
  useEffect(() => {
    if (!audioId) {
      setSegments([]);
      return;
    }

    loadSubtitles();
  }, [audioId, noteId]);

  const loadSubtitles = async () => {
    if (!audioId) return;
    
    setIsLoading(true);
    try {
      console.log(`[SubtitlePanel] Loading subtitles for audio: ${audioId}`);
      
      // Dynamically import API to avoid SSR issues
      const { getSessionWithSegments } = await import('@/lib/api/services/transcription-api');
      
      try {
        const sessionData = await getSessionWithSegments(audioId);
        
        if (sessionData.segments && sessionData.segments.length > 0) {
          const subtitles: SubtitleSegment[] = sessionData.segments.map(seg => ({
            id: seg.id,
            text: seg.text,
            startTime: seg.startTime,
            endTime: seg.endTime,
            confidence: seg.confidence,
            language: seg.language,
          }));
          
          console.log(`[SubtitlePanel] Loaded ${subtitles.length} subtitle segments`);
          setSegments(subtitles);
        } else {
          console.warn("[SubtitlePanel] No segments found");
          setSegments([]);
        }
      } catch (apiError) {
        console.warn("[SubtitlePanel] API failed, showing empty state:", apiError);
        setSegments([]);
      }
    } catch (error) {
      console.error("[SubtitlePanel] Failed to load subtitles:", error);
      setSegments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleExportSubtitles = () => {
    if (segments.length === 0) return;

    // Export as SRT format
    const srtContent = segments
      .map((seg, index) => {
        const startTime = formatTimestamp(seg.startTime);
        const endTime = formatTimestamp(seg.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${seg.text}\n`;
      })
      .join("\n");

    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subtitles_${audioId}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-scroll to current segment
  useEffect(() => {
    if (!containerRef.current) return;

    const currentSegmentIndex = segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
    );

    if (currentSegmentIndex >= 0) {
      const element = containerRef.current.children[currentSegmentIndex + 1]; // +1 for header
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [currentTime, segments]);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Subtitles className="w-5 h-5" />
          자막
        </h3>
        {segments.length > 0 && (
          <button
            onClick={handleExportSubtitles}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            내보내기
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">
            자막을 불러오는 중...
          </div>
        ) : !audioId ? (
          <div className="text-center text-gray-500 py-8">
            오디오를 선택하면 자막이 표시됩니다
          </div>
        ) : segments.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            자막이 없습니다
          </div>
        ) : (
          segments.map((segment, index) => {
            const isActive =
              currentTime >= segment.startTime && currentTime <= segment.endTime;

            return (
              <div
                key={segment.id}
                className={`p-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-[#AFC02B] text-[#1e1e1e]"
                    : "bg-[#2a2a2a] text-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`text-xs font-mono flex-shrink-0 ${
                      isActive ? "text-[#1e1e1e]" : "text-gray-500"
                    }`}
                  >
                    {formatTimestamp(segment.startTime)}
                  </span>
                  <p className={`text-sm ${isActive ? "font-medium" : ""}`}>
                    {segment.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

