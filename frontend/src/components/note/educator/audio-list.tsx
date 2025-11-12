/**
 * Audio List Component
 * 
 * Displays list of audio recordings for educator notes
 * - Shows audio title, duration, and play controls
 * - Fetches audio from IndexedDB and backend
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioItem {
  id: string;
  title: string;
  duration: number; // in seconds
  audioUrl: string;
  createdAt: Date;
}

interface AudioListProps {
  noteId: string;
  onAudioSelect: (audioId: string | null) => void;
  selectedAudioId: string | null;
}

export function AudioList({ noteId, onAudioSelect, selectedAudioId }: AudioListProps) {
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load audio files for this note
  useEffect(() => {
    loadAudioFiles();
  }, [noteId]);

  const loadAudioFiles = async () => {
    try {
      // DEBUG: Fetch from backend
      console.log(`[AudioList] Loading audio files for note: ${noteId}`);
      
      // Dynamically import API to avoid SSR issues
      const { getSessionsByNote } = await import('@/lib/api/services/transcription-api');
      
      try {
        const sessions = await getSessionsByNote(noteId);
        const audioItems: AudioItem[] = sessions
          .filter(session => session.fullAudioUrl) // Only sessions with audio
          .map(session => ({
            id: session.id,
            title: session.title,
            duration: Math.floor(session.duration),
            audioUrl: session.fullAudioUrl || '',
            createdAt: new Date(session.createdAt),
          }));
        
        console.log(`[AudioList] Loaded ${audioItems.length} audio files`);
        setAudios(audioItems);
      } catch (apiError) {
        // If API fails, show empty state
        console.warn("[AudioList] API failed, showing empty state:", apiError);
        setAudios([]);
      }
    } catch (error) {
      console.error("[AudioList] Failed to load audio files:", error);
      setAudios([]);
    }
  };

  const handleAudioClick = (audio: AudioItem) => {
    if (selectedAudioId === audio.id) {
      // Toggle play/pause
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      // Select new audio
      onAudioSelect(audio.id);
      setCurrentTime(0);
      
      if (audioRef.current) {
        audioRef.current.src = audio.audioUrl;
        audioRef.current.load();
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          오디오 목록
        </h3>
        <button
          className="text-xs text-gray-400 hover:text-white transition-colors"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "audio/*";
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                // TODO: Implement audio upload
                console.log("[AudioList] Upload audio:", file.name);
              }
            };
            input.click();
          }}
        >
          + 오디오 업로드
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {audios.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            오디오 파일이 없습니다
          </div>
        ) : (
          audios.map((audio) => (
            <button
              key={audio.id}
              onClick={() => handleAudioClick(audio)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                selectedAudioId === audio.id
                  ? "bg-[#4a4a4a] border border-white"
                  : "bg-[#2a2a2a] hover:bg-[#3a3a3a]"
              }`}
            >
              <div className="flex-shrink-0">
                {selectedAudioId === audio.id && isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <p className="text-white font-medium truncate">{audio.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{formatDuration(audio.duration)}</span>
                  {selectedAudioId === audio.id && isPlaying && (
                    <span className="text-[#AFC02B]">
                      {formatDuration(Math.floor(currentTime))}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {selectedAudioId === audio.id && (
                <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#AFC02B] transition-all"
                    style={{
                      width: `${(currentTime / audio.duration) * 100}%`,
                    }}
                  />
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
}

