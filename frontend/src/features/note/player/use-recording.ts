/**
 * 실제 녹음 기능 훅 (MediaRecorder API + Web Speech API for transcription)
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { SpeechRecognitionService, type SpeechSegment } from "@/lib/speech/speech-recognition";
import { useScriptTranslationStore } from "@/stores";
import type { WordWithTime } from "@/lib/types";
import * as transcriptionApi from "@/lib/api/transcription.api";

export interface RecordingData {
  id: string;
  title: string;
  audioBlob: Blob;
  duration: number;
  createdAt: Date;
  sessionId?: string; // Backend transcription session ID
}

/**
 * Estimate word-level timestamps for a text segment
 * @param text - Full text of the segment
 * @param startTime - Segment start time in seconds
 * @param confidence - Recognition confidence (0-1)
 * @returns Array of words with estimated timestamps
 */
function estimateWordTimestamps(
  text: string,
  startTime: number,
  confidence: number = 1.0
): WordWithTime[] {
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  if (words.length === 0) return [];

  // Estimate average speaking rate: ~2.5 words per second (Korean/English average)
  const avgWordsPerSecond = 2.5;
  const estimatedDuration = words.length / avgWordsPerSecond;
  const timePerWord = estimatedDuration / words.length;

  const wordTimestamps: WordWithTime[] = [];
  for (let i = 0; i < words.length; i++) {
    wordTimestamps.push({
      word: words[i],
      startTime: startTime + (i * timePerWord),
      confidence: confidence,
      wordIndex: i,
    });
  }

  console.log('[useRecording] Estimated word timestamps:', {
    text: text.substring(0, 50),
    wordCount: words.length,
    startTime,
    estimatedDuration: estimatedDuration.toFixed(2) + 's'
  });

  return wordTimestamps;
}

export function useRecording(noteId?: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null); // Track when recording started
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { setScriptSegments, clearScriptSegments} = useScriptTranslationStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionService | null>(null);
  
  // Track pause time for timestamp correction
  const pauseStartTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  
  // Track when Speech Recognition was (re)started for accurate timestamp calculation
  const speechRecognitionStartTimeRef = useRef<number>(0);
  const audioRecordingTimeAtSpeechStartRef = useRef<number>(0);
  
  // Store all segments (including interim) for real-time display
  const segmentsMapRef = useRef<Map<string, any>>(new Map());

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingStartTime(new Date()); // Record start time

      // Clear previous script segments and reset timing
      clearScriptSegments();
      segmentsMapRef.current.clear();
      totalPausedTimeRef.current = 0;
      pauseStartTimeRef.current = 0;
      speechRecognitionStartTimeRef.current = 0;
      audioRecordingTimeAtSpeechStartRef.current = 0;
      console.log('[useRecording] Cleared previous script segments and reset timing');

      // 마이크 권한 요청 (최적화된 설정)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // 48kHz 샘플링 레이트 (고품질)
          channelCount: 1, // 모노 오디오 (스테레오 불필요)
        }
      });
      
      console.log('[useRecording] Audio stream acquired:', {
        sampleRate: stream.getAudioTracks()[0]?.getSettings().sampleRate,
        channelCount: stream.getAudioTracks()[0]?.getSettings().channelCount,
      });

      streamRef.current = stream;

      // MediaRecorder 설정
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      // 안정적인 녹음을 위한 옵션 설정
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000, // 128kbps - 고품질 오디오
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 데이터 수집
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[useRecording] Audio chunk collected:', event.data.size, 'bytes');
        }
      };

      // 녹음 상태 로깅
      mediaRecorder.onstart = () => {
        console.log('[useRecording] MediaRecorder started');
      };

      mediaRecorder.onpause = () => {
        console.log('[useRecording] MediaRecorder paused');
      };

      mediaRecorder.onresume = () => {
        console.log('[useRecording] MediaRecorder resumed');
      };

      mediaRecorder.onstop = () => {
        console.log('[useRecording] MediaRecorder stopped, total chunks:', audioChunksRef.current.length);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('[useRecording] MediaRecorder error:', event.error);
      };

      // Initialize Web Speech API for transcription
      try {
        const speechRecognition = new SpeechRecognitionService(
          {
            language: 'ko-KR', // Default to Korean, can be made configurable
            continuous: true,
            interimResults: true,
          },
          {
            onSegment: (segment: SpeechSegment) => {
              // Calculate actual recording time based on Speech Recognition restart
              // segment.startTime is relative to when Speech Recognition (re)started
              // We need to add the audio recording time at that point
              const actualRecordingTime = audioRecordingTimeAtSpeechStartRef.current + segment.startTime;
              
              console.log('[useRecording] Speech segment:', {
                text: segment.text.substring(0, 30) + '...',
                segmentStartTime: segment.startTime.toFixed(2) + 's',
                audioTimeAtSpeechStart: audioRecordingTimeAtSpeechStartRef.current.toFixed(2) + 's',
                actualRecordingTime: actualRecordingTime.toFixed(2) + 's',
                isPartial: segment.isPartial,
              });

              const words = estimateWordTimestamps(
                segment.text,
                actualRecordingTime,
                segment.confidence || 1.0
              );

              const scriptSegment = {
                id: segment.isPartial ? `interim-${actualRecordingTime}` : segment.id,
                timestamp: actualRecordingTime * 1000, // Convert seconds to milliseconds
                originalText: segment.text,
                words: words,
                speaker: undefined,
                isPartial: segment.isPartial, // Mark for UI to handle
              };

              // Real-time update: Store all segments (interim + final)
              if (segment.isPartial) {
                // Update or add interim segment
                segmentsMapRef.current.set(scriptSegment.id, scriptSegment);
              } else {
                // Remove any interim with similar timestamp and add final
                Array.from(segmentsMapRef.current.keys()).forEach(key => {
                  if (key.startsWith('interim-')) {
                    const interimTime = parseFloat(key.replace('interim-', ''));
                    if (Math.abs(interimTime - actualRecordingTime) < 1.0) {
                      segmentsMapRef.current.delete(key);
                    }
                  }
                });
                segmentsMapRef.current.set(scriptSegment.id, scriptSegment);
                console.log('[useRecording] Finalized segment with', words.length, 'words');
              }

              // Update script store with all segments (sorted by time)
              const allSegments = Array.from(segmentsMapRef.current.values())
                .sort((a, b) => a.timestamp - b.timestamp);
              setScriptSegments(allSegments);
            },
            onError: (error) => {
              console.error('[useRecording] Speech recognition error:', error);
              // Don't stop recording on speech recognition error
            },
          }
        );

        speechRecognitionRef.current = speechRecognition;
        speechRecognition.start();
        
        // Record when Speech Recognition started and current audio recording time
        speechRecognitionStartTimeRef.current = Date.now();
        audioRecordingTimeAtSpeechStartRef.current = 0; // Starting fresh
        console.log('[useRecording] Speech recognition started at recording time: 0s');
      } catch (speechError) {
        console.error('[useRecording] Failed to start speech recognition:', speechError);
        // Continue recording even if speech recognition fails
      }

      // 녹음 시작 (timeslice 없이 - 가장 안정적)
      // timeslice를 지정하지 않으면 stop() 호출 시 전체 데이터가 한 번에 수집됨
      // 이 방식이 가장 안정적이고 끊김이 없음
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("녹음 시작 실패:", err);
      setError("마이크 권한이 필요합니다");
    }
  }, [clearScriptSegments, setScriptSegments]);

  // 녹음 일시정지
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // 현재까지의 데이터를 수집 (끊김 방지)
      mediaRecorderRef.current.requestData();
      
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Track pause start time
      pauseStartTimeRef.current = Date.now();
      console.log('[useRecording] Paused at:', pauseStartTimeRef.current);

      // Stop speech recognition during pause
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null; // Reset to allow restart
        console.log('[useRecording] Speech recognition stopped for pause');
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // 녹음 재개
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Add paused duration to total
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      totalPausedTimeRef.current += pauseDuration;
      console.log('[useRecording] Resumed after', (pauseDuration / 1000).toFixed(2) + 's', 
                  '| Total paused:', (totalPausedTimeRef.current / 1000).toFixed(2) + 's');

      // Restart speech recognition with same callbacks
      if (!speechRecognitionRef.current && streamRef.current) {
        try {
          const speechRecognition = new SpeechRecognitionService(
            {
              language: 'ko-KR',
              continuous: true,
              interimResults: true,
            },
            {
              onSegment: (segment: SpeechSegment) => {
                // Calculate actual recording time based on Speech Recognition restart
                const actualRecordingTime = audioRecordingTimeAtSpeechStartRef.current + segment.startTime;
                
                console.log('[useRecording] Speech segment (after resume):', {
                  text: segment.text.substring(0, 30) + '...',
                  segmentStartTime: segment.startTime.toFixed(2) + 's',
                  audioTimeAtSpeechStart: audioRecordingTimeAtSpeechStartRef.current.toFixed(2) + 's',
                  actualRecordingTime: actualRecordingTime.toFixed(2) + 's',
                  isPartial: segment.isPartial,
                });

                const words = estimateWordTimestamps(
                  segment.text,
                  actualRecordingTime,
                  segment.confidence || 1.0
                );

                const scriptSegment = {
                  id: segment.isPartial ? `interim-${actualRecordingTime}` : segment.id,
                  timestamp: actualRecordingTime * 1000,
                  originalText: segment.text,
                  words: words,
                  speaker: undefined,
                  isPartial: segment.isPartial,
                };

                // Real-time update: Store all segments (interim + final)
                if (segment.isPartial) {
                  segmentsMapRef.current.set(scriptSegment.id, scriptSegment);
                } else {
                  Array.from(segmentsMapRef.current.keys()).forEach(key => {
                    if (key.startsWith('interim-')) {
                      const interimTime = parseFloat(key.replace('interim-', ''));
                      if (Math.abs(interimTime - actualRecordingTime) < 1.0) {
                        segmentsMapRef.current.delete(key);
                      }
                    }
                  });
                  segmentsMapRef.current.set(scriptSegment.id, scriptSegment);
                  console.log('[useRecording] Finalized segment with', words.length, 'words');
                }

                const allSegments = Array.from(segmentsMapRef.current.values())
                  .sort((a, b) => a.timestamp - b.timestamp);
                setScriptSegments(allSegments);
              },
              onError: (error) => {
                console.error('[useRecording] Speech recognition error:', error);
              },
            }
          );

          speechRecognitionRef.current = speechRecognition;
          speechRecognition.start();
          
          // Record when Speech Recognition restarted and current audio recording time
          speechRecognitionStartTimeRef.current = Date.now();
          audioRecordingTimeAtSpeechStartRef.current = recordingTime; // Current recording time
          console.log('[useRecording] Speech recognition restarted at recording time:', recordingTime + 's');
        } catch (error) {
          console.error('[useRecording] Failed to restart speech recognition:', error);
        }
      }

      // 타이머 재개
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  }, [recordingTime, setScriptSegments]);

  // 녹음 종료 및 저장
  const stopRecording = useCallback(async (title?: string): Promise<RecordingData> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error("녹음이 시작되지 않았습니다"));
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Blob 생성
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/webm",
          });

          // Stop speech recognition
          if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
            speechRecognitionRef.current = null;
            console.log('[useRecording] Speech recognition stopped');
          }

          // Remove interim segments, keep only final ones
          const finalSegments = Array.from(segmentsMapRef.current.values())
            .filter(seg => !seg.isPartial)
            .sort((a, b) => a.timestamp - b.timestamp);
          
          setScriptSegments(finalSegments);
          console.log('[useRecording] Kept', finalSegments.length, 'final segments, removed interim segments');

          // 스트림 정리
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          // 타이머 정리
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // Generate default title if not provided
          const recordingTitle = title || `Recording ${new Date().toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}`;

          // Save to backend (create session, upload audio, save segments)
          setIsSaving(true);
          let sessionId: string | undefined;

          try {
            console.log('[useRecording] Creating transcription session:', recordingTitle, 'noteId:', noteId);
            
            // 1. Create session
            const session = await transcriptionApi.createSession(recordingTitle, noteId || undefined);
            sessionId = session.id;
            console.log('[useRecording] Created session:', sessionId);

            // 2. Convert audio blob to base64 data URL
            const audioDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(audioBlob);
            });

            // 3. Upload full audio
            console.log('[useRecording] Uploading full audio...');
            await transcriptionApi.saveFullAudio({
              sessionId,
              audioUrl: audioDataUrl,
              duration: recordingTime,
            });
            console.log('[useRecording] Full audio uploaded');

            // 4. Save transcription segments
            if (finalSegments.length > 0) {
              console.log('[useRecording] Saving', finalSegments.length, 'transcription segments...');
              
              for (const segment of finalSegments) {
                try {
                  await transcriptionApi.saveTranscript({
                    sessionId,
                    text: segment.originalText,
                    startTime: segment.timestamp / 1000, // Convert ms to seconds
                    endTime: (segment.timestamp / 1000) + (segment.originalText.split(/\s+/).length / 2.5),
                    confidence: 1.0,
                    isPartial: false,
                    language: 'ko',
                    words: segment.words?.map((w: WordWithTime) => ({
                      word: w.word,
                      startTime: w.startTime,
                      confidence: w.confidence || 1.0,
                      wordIndex: w.wordIndex,
                    })),
                  });
                } catch (segmentError) {
                  console.error('[useRecording] Failed to save segment:', segmentError);
                  // Continue with other segments
                }
              }
              
              console.log('[useRecording] All segments saved');
            }

            // 5. End session
            await transcriptionApi.endSession(sessionId);
            console.log('[useRecording] Session ended successfully');

          } catch (saveError) {
            console.error('[useRecording] Failed to save recording to backend:', saveError);
            setError('녹음 저장에 실패했습니다');
            // Continue with local data even if backend save fails
          } finally {
            setIsSaving(false);
          }

          const recordingData: RecordingData = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: recordingTitle,
            audioBlob,
            duration: recordingTime,
            createdAt: new Date(),
            sessionId, // Include backend session ID
          };

          // 상태 초기화
          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
          audioChunksRef.current = [];

          resolve(recordingData);
        } catch (error) {
          console.error('[useRecording] Error in stopRecording:', error);
          reject(error);
        }
      };

      // 마지막 데이터를 수집한 후 종료 (끊김 방지)
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
    });
  }, [recordingTime, setScriptSegments]);

  // 녹음 취소
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // 현재까지의 데이터 수집
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }

    // Stop speech recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
      speechRecognitionRef.current = null;
      console.log('[useRecording] Speech recognition aborted');
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Clear script segments
    clearScriptSegments();

    // 상태 초기화
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, [clearScriptSegments]);

  // 시간 포맷팅
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordingStartTime, // Export recording start time
    formattedTime: formatTime(recordingTime),
    error,
    isSaving,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}