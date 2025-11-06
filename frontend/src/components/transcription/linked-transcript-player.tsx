'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  isPartial: boolean;
  language?: string;
}

interface WordWithTime {
  word: string;
  startTime: number;
  endTime: number;
  segmentId: string;
}

interface LinkedTranscriptPlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  transcripts: TranscriptSegment[];
  className?: string;
}

export function LinkedTranscriptPlayer({
  audioUrl,
  audioBlob,
  transcripts,
  className = '',
}: LinkedTranscriptPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const wordsWithTime = useCallback((): WordWithTime[] => {
    const result: WordWithTime[] = [];
    
    transcripts
      .filter(seg => !seg.isPartial)
      .forEach(segment => {
        const words = segment.text.trim().split(/\s+/);
        const duration = segment.endTime - segment.startTime;
        const timePerWord = duration / words.length;
        
        words.forEach((word, index) => {
          result.push({
            word,
            startTime: segment.startTime + (timePerWord * index),
            endTime: segment.startTime + (timePerWord * (index + 1)),
            segmentId: segment.id,
          });
        });
      });
    
    return result;
  }, [transcripts]);

  const allWords = wordsWithTime();

  const currentWord = allWords.find(
    (word) => currentTime >= word.startTime && currentTime < word.endTime
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('[LinkedTranscriptPlayer] 🎵 Initializing audio source:', {
      hasBlob: !!audioBlob,
      hasUrl: !!audioUrl,
      transcriptCount: transcripts.length,
    });

    setIsLoading(true);
    setAudioError(null);

    let sourceUrl: string | null = null;

    if (audioBlob) {
      sourceUrl = URL.createObjectURL(audioBlob);
      blobUrlRef.current = sourceUrl;
      console.log('[LinkedTranscriptPlayer] ✅ Using LOCAL BLOB');
    } else if (audioUrl) {
      sourceUrl = audioUrl;
      console.log('[LinkedTranscriptPlayer] ✅ Using REMOTE URL');
    } else {
      console.error('[LinkedTranscriptPlayer] ❌ No audio source available');
      setAudioError('오디오 소스가 없습니다.');
      setIsLoading(false);
      return;
    }

    audio.src = sourceUrl;
    audio.load();

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [audioBlob, audioUrl, transcripts.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      console.log('[LinkedTranscriptPlayer] ✅ Metadata loaded, duration:', audio.duration);
      setDuration(audio.duration);
    };

    const handleLoadedData = () => {
      console.log('[LinkedTranscriptPlayer] ✅ Audio data loaded');
      setIsLoading(false);
      setAudioError(null);
    };

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      console.log('[LinkedTranscriptPlayer] ⏹ Playback ended (reached end of audio)');
      console.log('[LinkedTranscriptPlayer] 📊 Final state:', {
        currentTime: audio.currentTime,
        duration: audio.duration,
      });
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handlePlay = () => {
      console.log('[LinkedTranscriptPlayer] ▶️ Play event triggered');
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.log('[LinkedTranscriptPlayer] ⏸️ Pause event triggered (stack trace below)');
      console.trace();
      setIsPlaying(false);
    };

    const handleSeeking = () => {
      setIsSeeking(true);
    };

    const handleSeeked = () => {
      setIsSeeking(false);
      setCurrentTime(audio.currentTime);
      console.log('[LinkedTranscriptPlayer] ✅ Seeked to:', audio.currentTime);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      console.error('[LinkedTranscriptPlayer] ❌ Audio error:', {
        error: audio.error,
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message,
      });

      let errorMessage = '오디오 재생 중 오류가 발생했습니다.';
      
      if (audio.error) {
        switch (audio.error.code) {
          case 1:
            errorMessage = '오디오 로드가 중단되었습니다.';
            break;
          case 2:
            errorMessage = '네트워크 오류로 오디오를 로드할 수 없습니다.';
            break;
          case 3:
            errorMessage = '오디오 디코딩 오류가 발생했습니다.';
            break;
          case 4:
            errorMessage = '오디오 형식이 지원되지 않거나 파일이 손상되었습니다.';
            break;
        }
      }

      setAudioError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [isSeeking]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.readyState >= 2) {
        audio.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('[LinkedTranscriptPlayer] ❌ Play failed:', err);
            setAudioError('재생에 실패했습니다. 다시 시도해주세요.');
          }
        });
      } else {
        console.log('[LinkedTranscriptPlayer] ⏳ Waiting for audio to be ready...');
        const handleCanPlay = () => {
          audio.play().catch((err) => {
            if (err.name !== 'AbortError') {
              console.error('[LinkedTranscriptPlayer] ❌ Play failed:', err);
              setAudioError('재생에 실패했습니다. 다시 시도해주세요.');
            }
          });
          audio.removeEventListener('canplay', handleCanPlay);
        };
        audio.addEventListener('canplay', handleCanPlay);
      }
    }
  }, [isPlaying, isLoading]);

  const seekToTime = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || isLoading) {
      console.warn('[LinkedTranscriptPlayer] ⚠️ Audio not ready for seeking');
      return;
    }

    console.log('[LinkedTranscriptPlayer] 🎯 Seeking to time:', time, 'and playing to end');
    console.log('[LinkedTranscriptPlayer] 📊 Audio state:', {
      readyState: audio.readyState,
      currentTime: audio.currentTime,
      duration: audio.duration,
      paused: audio.paused,
    });

    // Set the current time
    audio.currentTime = time;
    
    // Start playing from this point to the end
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[LinkedTranscriptPlayer] ✅ Playing from', time, 'to end');
          setIsPlaying(true);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('[LinkedTranscriptPlayer] ❌ Play after seek failed:', err);
            setAudioError('재생에 실패했습니다. 다시 시도해주세요.');
          }
        });
    }
  }, [isLoading]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || isLoading || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    console.log('[LinkedTranscriptPlayer] 🎯 Progress bar clicked, seeking to:', newTime);
    audio.currentTime = newTime;
  }, [duration, isLoading]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const finalTranscripts = transcripts.filter((seg) => !seg.isPartial);

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      <audio ref={audioRef} preload="auto" />

      {audioError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 text-sm">❌ {audioError}</p>
        </div>
      )}

      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !!audioError}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white flex items-center justify-center transition-colors shadow-lg"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
            )}
          </button>

          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-2 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div
              onClick={handleProgressClick}
              className="relative h-2 bg-gray-200 rounded-full cursor-pointer hover:h-3 transition-all"
            >
              <div
                className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {currentWord && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-900 font-bold text-lg">&ldquo;{currentWord.word}&rdquo;</p>
            <p className="text-blue-600 text-xs mt-1">
              {formatTime(currentWord.startTime)} - {formatTime(currentWord.endTime)}
            </p>
          </div>
        )}
      </div>

      <div className="p-6 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📝 자막 ({finalTranscripts.length}개 문장, {allWords.length}개 단어)
          <span className="text-sm font-normal text-gray-500">
            단어 클릭 시 해당 위치부터 끝까지 재생
          </span>
        </h3>

        {finalTranscripts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            자막이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {finalTranscripts.map((segment) => {
              const segmentWords = allWords.filter(w => w.segmentId === segment.id);
              
              return (
                <div
                  key={segment.id}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(segment.startTime)}
                    </span>
                    {segment.confidence !== undefined && segment.confidence < 0.8 && (
                      <span className="text-xs text-yellow-600">
                        ⚠️ 낮은 신뢰도 ({Math.round(segment.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {segmentWords.map((wordData, idx) => {
                      const isActive = currentWord?.word === wordData.word && 
                                      currentWord?.startTime === wordData.startTime;
                      
                      return (
                        <button
                          key={`${segment.id}-${idx}`}
                          onClick={() => seekToTime(wordData.startTime)}
                          className={`px-2 py-1 rounded transition-all ${
                            isActive
                              ? 'bg-blue-500 text-white font-bold shadow-lg scale-110'
                              : 'bg-white hover:bg-blue-100 text-gray-700 hover:text-blue-900 border border-gray-300 hover:border-blue-400'
                          }`}
                          title={`${formatTime(wordData.startTime)} - ${formatTime(wordData.endTime)}`}
                        >
                          {wordData.word}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
