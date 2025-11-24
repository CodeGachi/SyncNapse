/**
 * 실제 녹음 기능 훅 (MediaRecorder API + Web Speech API for transcription)
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

  const queryClient = useQueryClient();
  const { setScriptSegments, clearScriptSegments} = useScriptTranslationStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionService | null>(null);

  // Track recording state for cleanup (prevent stale closure)
  const isRecordingRef = useRef(false);

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

      // 데이터 수집 - continuous collection for seamless audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('[useRecording] Audio chunk collected:', event.data.size, 'bytes', 
                      '| Total chunks:', audioChunksRef.current.length,
                      '| Total size:', audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
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

      // 녹음 시작 (timeslice 없이 - /transcription 페이지와 동일한 방식)
      // timeslice 없이 시작하여 stop() 호출 시 모든 데이터를 한 번에 수집
      // 이 방식이 가장 안정적이고 끊김이 없음 (webm 파일 무결성 보장)
      mediaRecorder.start();
      console.log('[useRecording] MediaRecorder started without timeslice (following /transcription pattern)');
      setIsRecording(true);
      isRecordingRef.current = true; // 🔥 FIX: Update ref
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
      // Request current data before pause to prevent data loss
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Track pause start time
      pauseStartTimeRef.current = Date.now();
      console.log('[useRecording] Paused at:', pauseStartTimeRef.current, 
                  '| Chunks collected so far:', audioChunksRef.current.length);

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
          // Blob 생성 - 모든 chunk를 순서대로 병합
          console.log('[useRecording] Creating final audio blob from', audioChunksRef.current.length, 'chunks');
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/webm",
          });
          console.log('[useRecording] Final audio blob size:', audioBlob.size, 'bytes', 
                      '| Type:', audioBlob.type);

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

          // Generate default title if not provided (using recording start time)
          let recordingTitle = title;
          if (!recordingTitle && recordingStartTime) {
            // Format: YYYY_MM_DD_HH:MM:SS (with leading zeros)
            const year = recordingStartTime.getFullYear();
            const month = String(recordingStartTime.getMonth() + 1).padStart(2, '0');
            const day = String(recordingStartTime.getDate()).padStart(2, '0');
            const hours = String(recordingStartTime.getHours()).padStart(2, '0');
            const minutes = String(recordingStartTime.getMinutes()).padStart(2, '0');
            const seconds = String(recordingStartTime.getSeconds()).padStart(2, '0');
            
            recordingTitle = `${year}_${month}_${day}_${hours}:${minutes}:${seconds}`;
            console.log('[useRecording] Generated default title from start time:', recordingTitle);
          } else if (!recordingTitle) {
            // Fallback if recordingStartTime is not available
            recordingTitle = `Recording ${new Date().toLocaleString('ko-KR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}`;
          }

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
            console.log('[useRecording] Uploading full audio...', {
              sessionId,
              audioBlobSize: audioBlob.size,
              audioBlobType: audioBlob.type,
              base64Length: audioDataUrl.length,
              duration: recordingTime,
            });
            const uploadResult = await transcriptionApi.saveFullAudio({
              sessionId,
              audioUrl: audioDataUrl,
              duration: recordingTime,
            });
            console.log('[useRecording] Full audio upload result:', {
              fullAudioUrl: uploadResult.fullAudioUrl,
              fullAudioKey: uploadResult.fullAudioKey,
              status: uploadResult.status,
            });

            // 4. Save transcription segments (병렬 처리로 성능 개선)
            if (finalSegments.length > 0 && sessionId) {
              console.log('[useRecording] Saving', finalSegments.length, 'transcription segments in parallel...');
              const startTime = Date.now();

              // Promise.all로 병렬 처리 - 훨씬 빠름!
              const savePromises = finalSegments.map(async (segment) => {
                try {
                  await transcriptionApi.saveTranscript({
                    sessionId: sessionId!,
                    text: segment.originalText || '',
                    startTime: segment.timestamp / 1000, // Convert ms to seconds
                    endTime: (segment.timestamp / 1000) + ((segment.originalText || '').split(/\s+/).length / 2.5),
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
              });

              // 모든 세그먼트 저장 대기
              await Promise.all(savePromises);

              const elapsed = Date.now() - startTime;
              console.log('[useRecording] All segments saved in', elapsed + 'ms',
                          '(avg:', (elapsed / finalSegments.length).toFixed(0) + 'ms per segment)');
            }

            // 5. End session
            await transcriptionApi.endSession(sessionId);
            console.log('[useRecording] Session ended successfully');

            // invalidateQueries는 use-recording-control.ts에서 처리함 (중복 호출 방지)

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
          isRecordingRef.current = false; // 🔥 FIX: Update ref
          setIsPaused(false);
          setRecordingTime(0);
          audioChunksRef.current = [];

          resolve(recordingData);
        } catch (error) {
          console.error('[useRecording] Error in stopRecording:', error);
          reject(error);
        }
      };

      // 녹음 종료 - /transcription 패턴 따라 stop()만 호출
      // ondataavailable에서 자동으로 마지막 데이터를 수집함
      console.log('[useRecording] Stopping recording... Current chunks:', audioChunksRef.current.length);
      mediaRecorderRef.current.stop();
    });
  }, [recordingTime, setScriptSegments, queryClient, noteId]);

  // 녹음 취소
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Stop without requesting data - we're discarding anyway
      mediaRecorderRef.current.stop();
      console.log('[useRecording] Recording cancelled');
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
    isRecordingRef.current = false; // 🔥 FIX: Update ref
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

  // ✅ 페이지 이동 시 경고 + 자동 저장
  useEffect(() => {
    if (!isRecording) return;

    console.log('[useRecording] 🎤 Recording active - setting up beforeunload handler');

    let isSavingOnExit = false; // 중복 저장 방지 플래그

    // 1. beforeunload 이벤트로 경고 표시
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set

      // 페이지를 떠나기 전 자동 저장 시도 (visibilitychange가 먼저 처리될 수도 있음)
      if (!isSavingOnExit && mediaRecorderRef.current?.state !== 'inactive') {
        isSavingOnExit = true;
        console.log('[useRecording] ⚠️ beforeunload: Attempting to save recording...');

        // 자동 저장 제목 생성
        const autoSaveTitle = recordingStartTime
          ? `자동저장_${recordingStartTime.getFullYear()}_${String(recordingStartTime.getMonth() + 1).padStart(2, '0')}_${String(recordingStartTime.getDate()).padStart(2, '0')}_${String(recordingStartTime.getHours()).padStart(2, '0')}:${String(recordingStartTime.getMinutes()).padStart(2, '0')}:${String(recordingStartTime.getSeconds()).padStart(2, '0')}`
          : `자동저장_${new Date().toISOString()}`;

        // 녹음 중단 및 저장 (비동기지만 최선의 노력)
        stopRecording(autoSaveTitle).catch((err) => {
          console.error('[useRecording] Failed to auto-save on beforeunload:', err);
        });
      }

      return ''; // For other browsers
    };

    // 2. visibilitychange 이벤트로 페이지 숨김 시 자동 저장
    const handleVisibilityChange = async () => {
      // 페이지가 숨겨지고(hidden) 녹음 중이면 자동 저장
      if (document.hidden && isRecording && !isSavingOnExit && mediaRecorderRef.current?.state !== 'inactive') {
        isSavingOnExit = true;
        console.log('[useRecording] 👁️ Page hidden - auto-saving recording...');

        try {
          // 자동 저장 제목 생성
          const autoSaveTitle = recordingStartTime
            ? `자동저장_${recordingStartTime.getFullYear()}_${String(recordingStartTime.getMonth() + 1).padStart(2, '0')}_${String(recordingStartTime.getDate()).padStart(2, '0')}_${String(recordingStartTime.getHours()).padStart(2, '0')}:${String(recordingStartTime.getMinutes()).padStart(2, '0')}:${String(recordingStartTime.getSeconds()).padStart(2, '0')}`
            : `자동저장_${new Date().toISOString()}`;

          await stopRecording(autoSaveTitle);
          console.log('[useRecording] ✅ Recording auto-saved successfully');
        } catch (error) {
          console.error('[useRecording] ❌ Failed to auto-save on visibility change:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Cleanup: 컴포넌트 unmount 시 리소스 정리
    return () => {
      console.log('[useRecording] 🧹 Component unmounting...');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // 녹음 중이면 리소스 정리 (저장은 beforeunload/visibilitychange에서 처리됨)
      // 🔥 FIX: Use ref instead of state to prevent stale closure
      if (isRecordingRef.current && !isSavingOnExit) {
        console.log('[useRecording] ⚠️ Recording still active during unmount - cleaning up resources');

        // 음성 인식 중단
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.abort();
          speechRecognitionRef.current = null;
          console.log('[useRecording] 🗣️ Speech recognition stopped');
        }

        // 스트림 정리 (마이크 끄기)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            console.log('[useRecording] 🎤 Stopping microphone track:', track.label);
            track.stop();
          });
          streamRef.current = null;
        }

        // 타이머 정리
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          console.log('[useRecording] ⏱️ Timer cleared');
        }

        console.log('[useRecording] ✅ Resources cleaned up');
      }
    };
  }, []); // 🔥 FIX: dependency 제거 - mount/unmount 시에만 cleanup 실행

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