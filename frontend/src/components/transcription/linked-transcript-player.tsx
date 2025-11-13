'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface WordWithTime {
  word: string;
  startTime: number;
  confidence?: number;
  wordIndex: number;
}

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  confidence?: number;
  isPartial: boolean;
  language?: string;
  words?: WordWithTime[];
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

  // Find current segment and word based on startTime
  const finalTranscripts = transcripts.filter(seg => !seg.isPartial);
  
  const currentSegment = finalTranscripts.find((segment, index, arr) => {
    const nextSegment = arr[index + 1];
    return currentTime >= segment.startTime && 
           (!nextSegment || currentTime < nextSegment.startTime);
  });

  // Find current word within the current segment
  const currentWord = currentSegment?.words?.find((word, index, arr) => {
    const nextWord = arr[index + 1];
    return currentTime >= word.startTime && 
           (!nextWord || currentTime < nextWord.startTime);
  });

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
      console.log('[LinkedTranscriptPlayer] ✅ Using LOCAL BLOB:', {
        size: audioBlob.size,
        type: audioBlob.type,
      });
    } else if (audioUrl) {
      sourceUrl = audioUrl;
      console.log('[LinkedTranscriptPlayer] ✅ Using REMOTE URL:', sourceUrl.substring(0, 100) + '...');
    } else {
      console.error('[LinkedTranscriptPlayer] ❌ No audio source available');
      setAudioError('오디오 소스가 없습니다.');
      setIsLoading(false);
      return;
    }

    // Set audio type explicitly to help browser decode
    audio.src = sourceUrl;
    audio.setAttribute('type', 'audio/webm');
    
    console.log('[LinkedTranscriptPlayer] 📥 Loading audio from:', sourceUrl.substring(0, 100) + '...');
    audio.load();

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
    // Only reload when audio source changes, not when transcripts change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      console.log('[LinkedTranscriptPlayer] ✅ Metadata loaded, duration:', audio.duration);
      setDuration(audio.duration);
    };

    const handleLoadedData = () => {
      console.log('[LinkedTranscriptPlayer] ✅ Audio data loaded');
      console.log('[LinkedTranscriptPlayer] 📊 Audio state:', {
        readyState: audio.readyState,
        paused: audio.paused,
        currentTime: audio.currentTime,
        duration: audio.duration,
      });
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
      // Don't reset currentTime automatically - let user decide to restart
      console.log('[LinkedTranscriptPlayer] Audio playback completed');
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
      // If at the end, restart from beginning
      if (audio.currentTime >= audio.duration - 0.1) {
        console.log('[LinkedTranscriptPlayer] 🔄 Restarting from beginning');
        audio.currentTime = 0;
      }
      
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

  const playFromStart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    console.log('[LinkedTranscriptPlayer] 🔄 Playing from start (0:00)');
    audio.currentTime = 0;
    audio.play().catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('[LinkedTranscriptPlayer] ❌ Play from start failed:', err);
        setAudioError('재생에 실패했습니다. 다시 시도해주세요.');
      }
    });
  }, [isLoading]);

  const seekToTime = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || isLoading) {
      console.warn('[LinkedTranscriptPlayer] ⚠️ Audio not ready for seeking');
      return;
    }

    console.log('[LinkedTranscriptPlayer] 🎯 Seeking to time:', time, 'seconds');
    console.log('[LinkedTranscriptPlayer] 📊 Audio state BEFORE seek:', {
      readyState: audio.readyState,
      currentTime: audio.currentTime,
      duration: audio.duration,
      paused: audio.paused,
    });

    // IMPORTANT: Only use startTime, NOT endTime
    // This ensures audio plays from the clicked point to the END of the audio
    audio.currentTime = time;
    
    console.log('[LinkedTranscriptPlayer] ✅ Audio currentTime set to:', time);
    console.log('[LinkedTranscriptPlayer] 🎵 Will play from', time, 'to', audio.duration, '(end of audio)');
    
    // Start playing from this point to the END (no stop logic)
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[LinkedTranscriptPlayer] ✅ Successfully started playing from', time);
          console.log('[LinkedTranscriptPlayer] 📊 Audio state AFTER play:', {
            currentTime: audio.currentTime,
            paused: audio.paused,
            ended: audio.ended,
          });
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

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      <audio ref={audioRef} preload="auto" crossOrigin="anonymous">
        {/* Fallback source elements */}
        <source type="audio/webm;codecs=opus" />
        <source type="audio/webm" />
      </audio>

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
            title={isPlaying ? '일시정지' : '재생/계속'}
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

          <button
            onClick={playFromStart}
            disabled={isLoading || !!audioError}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 text-gray-700 flex items-center gap-2 transition-colors"
            title="처음부터 재생"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 5a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm8 0a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1h-2a1 1 0 01-1-1V5z" />
              <path d="M2 10l4-3v6l-4-3z" />
            </svg>
            <span className="text-sm font-medium">처음부터</span>
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

        {currentSegment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-900 font-bold text-lg">&ldquo;{currentSegment.text}&rdquo;</p>
            <p className="text-blue-600 text-xs mt-1">
              {formatTime(currentSegment.startTime)}
            </p>
          </div>
        )}
      </div>

      <div className="p-6 max-h-96 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            📝 자막 ({finalTranscripts.length}개 문장, {finalTranscripts.reduce((sum, t) => sum + (t.words?.length || 0), 0)}개 단어)
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>사용법:</strong> 
              <span className="ml-1">
                <strong>단어</strong>를 클릭하면 해당 단어부터 재생됩니다 (노란색 = 현재 재생 중)
              </span>
            </p>
          </div>
        </div>

        {finalTranscripts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            자막이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {finalTranscripts.map((segment) => {
              const isCurrentSegment = currentSegment?.id === segment.id;
              
              return (
                <button
                  key={segment.id}
                  onClick={() => seekToTime(segment.startTime)}
                  className={`w-full text-left p-4 rounded-lg border transition-all group ${
                    isCurrentSegment
                      ? 'bg-blue-50 border-blue-400 shadow-lg'
                      : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-white'
                  }`}
                  title={`${formatTime(segment.startTime)}부터 끝까지 재생`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs font-mono flex items-center gap-1 transition-colors ${
                      isCurrentSegment ? 'text-blue-600 font-semibold' : 'text-gray-500 group-hover:text-blue-600'
                    }`}>
                      <svg className={`w-3 h-3 transition-opacity ${
                        isCurrentSegment ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 4l10 6-10 6V4z" />
                      </svg>
                      {formatTime(segment.startTime)}
                    </span>
                    {segment.confidence !== undefined && segment.confidence < 0.8 && (
                      <span className="text-xs text-yellow-600">
                        ⚠️ 낮은 신뢰도 ({Math.round(segment.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                  
                  {/* Word-level rendering with click-to-play */}
                  {segment.words && segment.words.length > 0 ? (
                    <p className={`text-base leading-relaxed ${
                      isCurrentSegment ? 'text-blue-900 font-medium' : 'text-gray-700'
                    }`}>
                      {segment.words.map((word, wordIndex) => {
                        const isCurrentWord = isCurrentSegment && currentWord?.wordIndex === wordIndex;
                        
                        return (
                          <span
                            key={`${segment.id}-word-${wordIndex}`}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent segment click
                              console.log('[LinkedTranscriptPlayer] 🎯 Word clicked:', word.word, 'startTime:', word.startTime);
                              seekToTime(word.startTime);
                            }}
                            className={`inline-block px-1 py-0.5 rounded transition-all cursor-pointer hover:bg-blue-100 ${
                              isCurrentWord 
                                ? 'bg-yellow-200 text-blue-900 font-bold shadow-sm' 
                                : ''
                            }`}
                            title={`${formatTime(word.startTime)}부터 재생 (신뢰도: ${Math.round((word.confidence ?? 1) * 100)}%)`}
                          >
                            {word.word}
                          </span>
                        );
                      })}
                    </p>
                  ) : (
                    <>
                      {console.log('[LinkedTranscriptPlayer] ⚠️ No words for segment:', segment.id, 'text:', segment.text)}
                      <p className={`text-base leading-relaxed ${
                        isCurrentSegment ? 'text-blue-900 font-medium' : 'text-gray-700'
                      }`}>
                        {segment.text}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
