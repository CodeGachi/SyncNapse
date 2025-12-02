/**
 * 실제 녹음 기능 훅
 * MediaRecorder API + Web Speech API를 사용한 녹음 및 실시간 음성 인식
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SpeechRecognitionService, type SpeechSegment } from "@/lib/speech/speech-recognition";
import { useScriptTranslationStore } from "@/stores";
import type { WordWithTime } from "@/lib/types";
import * as transcriptionApi from "@/lib/api/transcription.api";
import * as audioApi from "@/lib/api/audio.api";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("Recording");

export interface RecordingData {
  id: string;
  title: string;
  audioBlob: Blob;
  duration: number;
  createdAt: Date;
  sessionId?: string; // Backend transcription session ID
  audioRecordingId?: string; // Backend audio recording ID (for timeline events)
}

/**
 * 텍스트 세그먼트에 대한 단어별 타임스탬프 추정
 * @param text - 세그먼트의 전체 텍스트
 * @param startTime - 세그먼트 시작 시간 (초)
 * @param confidence - 인식 신뢰도 (0-1)
 * @returns 추정된 타임스탬프가 포함된 단어 배열
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

  log.debug('단어 타임스탬프 추정:', {
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
  const [audioRecordingId, setAudioRecordingId] = useState<string | null>(null); // AudioRecording ID for timeline

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
      const startTime = new Date();
      setRecordingStartTime(startTime); // Record start time
      setAudioRecordingId(null); // Reset audio recording ID

      // Clear previous script segments and reset timing
      clearScriptSegments();
      segmentsMapRef.current.clear();
      totalPausedTimeRef.current = 0;
      pauseStartTimeRef.current = 0;
      speechRecognitionStartTimeRef.current = 0;
      audioRecordingTimeAtSpeechStartRef.current = 0;
      log.debug('이전 스크립트 세그먼트 정리 및 타이밍 리셋');

      // Create AudioRecording for timeline events (if noteId exists)
      let createdAudioRecordingId: string | null = null;
      if (noteId) {
        try {
          const defaultTitle = `${startTime.getFullYear()}_${String(startTime.getMonth() + 1).padStart(2, '0')}_${String(startTime.getDate()).padStart(2, '0')}_${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}:${String(startTime.getSeconds()).padStart(2, '0')}`;
          const audioRecording = await audioApi.createRecording({
            noteId,
            title: defaultTitle,
          });
          createdAudioRecordingId = audioRecording.id;
          setAudioRecordingId(audioRecording.id);
          log.debug('타임라인용 AudioRecording 생성됨:', audioRecording.id);
        } catch (audioRecordingError) {
          log.error('AudioRecording 생성 실패:', audioRecordingError);
          // Continue recording even if AudioRecording creation fails
        }
      }

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
      
      log.debug('오디오 스트림 획득:', {
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

      // 데이터 수집 - 끊김 없는 오디오를 위한 연속 수집
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          log.debug('오디오 청크 수집:', event.data.size, 'bytes',
                      '| 총 청크:', audioChunksRef.current.length,
                      '| 총 크기:', audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0), 'bytes');
        }
      };

      // 녹음 상태 로깅
      mediaRecorder.onstart = () => {
        log.debug('MediaRecorder 시작됨');
      };

      mediaRecorder.onpause = () => {
        log.debug('MediaRecorder 일시정지됨');
      };

      mediaRecorder.onresume = () => {
        log.debug('MediaRecorder 재개됨');
      };

      mediaRecorder.onstop = () => {
        log.debug('MediaRecorder 중지됨, 총 청크:', audioChunksRef.current.length);
      };

      mediaRecorder.onerror = (event: any) => {
        log.error('MediaRecorder 오류:', event.error);
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
              
              log.debug('음성 세그먼트:', {
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
                log.debug('세그먼트 확정됨:', words.length, '개 단어');
              }

              // Update script store with all segments (sorted by time)
              const allSegments = Array.from(segmentsMapRef.current.values())
                .sort((a, b) => a.timestamp - b.timestamp);
              setScriptSegments(allSegments);
            },
            onError: (error) => {
              log.error('음성 인식 오류:', error);
              // 음성 인식 오류 시 녹음은 계속
            },
          }
        );

        speechRecognitionRef.current = speechRecognition;
        speechRecognition.start();
        
        // 음성 인식 시작 시간과 현재 오디오 녹음 시간 기록
        speechRecognitionStartTimeRef.current = Date.now();
        audioRecordingTimeAtSpeechStartRef.current = 0; // 새로 시작
        log.debug('음성 인식 시작됨, 녹음 시간: 0s');
      } catch (speechError) {
        log.error('음성 인식 시작 실패:', speechError);
        // 음성 인식 실패해도 녹음은 계속
      }

      // 녹음 시작 (timeslice 없이 - /transcription 페이지와 동일한 방식)
      // timeslice 없이 시작하여 stop() 호출 시 모든 데이터를 한 번에 수집
      // 이 방식이 가장 안정적이고 끊김이 없음 (webm 파일 무결성 보장)
      mediaRecorder.start();
      log.debug('MediaRecorder 시작됨 (timeslice 없이 - /transcription 패턴 준수)');
      setIsRecording(true);
      isRecordingRef.current = true; // 🔥 FIX: Update ref
      setIsPaused(false);
      setRecordingTime(0);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      log.error("녹음 시작 실패:", err);
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
      
      // 일시정지 시작 시간 추적
      pauseStartTimeRef.current = Date.now();
      log.debug('일시정지됨:', pauseStartTimeRef.current,
                  '| 수집된 청크:', audioChunksRef.current.length);

      // 일시정지 중 음성 인식 중지
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null; // 재시작 허용을 위해 리셋
        log.debug('일시정지를 위해 음성 인식 중지됨');
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

      // 일시정지 시간을 총합에 추가
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      totalPausedTimeRef.current += pauseDuration;
      log.debug('재개됨:', (pauseDuration / 1000).toFixed(2) + 's 후',
                  '| 총 일시정지 시간:', (totalPausedTimeRef.current / 1000).toFixed(2) + 's');

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
                
                log.debug('음성 세그먼트 (재개 후):', {
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
                  log.debug('세그먼트 확정됨:', words.length, '개 단어');
                }

                const allSegments = Array.from(segmentsMapRef.current.values())
                  .sort((a, b) => a.timestamp - b.timestamp);
                setScriptSegments(allSegments);
              },
              onError: (error) => {
                log.error('음성 인식 오류:', error);
              },
            }
          );

          speechRecognitionRef.current = speechRecognition;
          speechRecognition.start();
          
          // 음성 인식 재시작 시간과 현재 오디오 녹음 시간 기록
          speechRecognitionStartTimeRef.current = Date.now();
          audioRecordingTimeAtSpeechStartRef.current = recordingTime; // 현재 녹음 시간
          log.debug('음성 인식 재시작됨, 녹음 시간:', recordingTime + 's');
        } catch (error) {
          log.error('음성 인식 재시작 실패:', error);
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
          log.debug('최종 오디오 Blob 생성 중:', audioChunksRef.current.length, '개 청크');
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/webm",
          });
          log.debug('최종 오디오 Blob 크기:', audioBlob.size, 'bytes',
                      '| 타입:', audioBlob.type);

          // 음성 인식 중지
          if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
            speechRecognitionRef.current = null;
            log.debug('음성 인식 중지됨');
          }

          // 임시 세그먼트 제거, 최종 세그먼트만 유지
          const finalSegments = Array.from(segmentsMapRef.current.values())
            .filter(seg => !seg.isPartial)
            .sort((a, b) => a.timestamp - b.timestamp);

          setScriptSegments(finalSegments);
          log.debug('최종 세그먼트', finalSegments.length, '개 유지, 임시 세그먼트 제거됨');

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
            log.debug('시작 시간으로 기본 제목 생성:', recordingTitle);
          } else if (!recordingTitle) {
            // Fallback if recordingStartTime is not available
            recordingTitle = `Recording ${new Date().toLocaleString('ko-KR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}`;
          }

          // 백엔드에 저장 (세션 생성, 오디오 업로드, 세그먼트 저장)
          setIsSaving(true);
          let sessionId: string | undefined;

          try {
            log.debug('트랜스크립션 세션 생성 중:', recordingTitle, 'noteId:', noteId, 'audioRecordingId:', audioRecordingId);

            // 1. 세션 생성 (audioRecordingId 포함하여 타임라인 연동)
            const session = await transcriptionApi.createSession(recordingTitle, noteId || undefined, audioRecordingId || undefined);
            sessionId = session.id;
            log.debug('세션 생성됨:', sessionId, 'audioRecordingId:', audioRecordingId);

            // 2. Convert audio blob to base64 data URL
            const audioDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(audioBlob);
            });

            // 3. 전체 오디오 업로드
            log.debug('전체 오디오 업로드 중...', {
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
            log.debug('전체 오디오 업로드 결과:', {
              fullAudioUrl: uploadResult.fullAudioUrl,
              fullAudioKey: uploadResult.fullAudioKey,
              status: uploadResult.status,
            });

            // 4. 트랜스크립션 세그먼트 저장 (병렬 처리로 성능 개선)
            if (finalSegments.length > 0 && sessionId) {
              log.debug('트랜스크립션 세그먼트', finalSegments.length, '개 병렬 저장 중...');
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
                  log.error('세그먼트 저장 실패:', segmentError);
                  // 다른 세그먼트는 계속 저장
                }
              });

              // 모든 세그먼트 저장 대기
              await Promise.all(savePromises);

              const elapsed = Date.now() - startTime;
              log.debug('모든 세그먼트 저장 완료:', elapsed + 'ms',
                          '(평균:', (elapsed / finalSegments.length).toFixed(0) + 'ms/세그먼트)');
            }

            // 5. 세션 종료
            await transcriptionApi.endSession(sessionId);
            log.debug('세션 종료 완료');

            // invalidateQueries는 use-recording-control.ts에서 처리함 (중복 호출 방지)

          } catch (saveError) {
            log.error('백엔드에 녹음 저장 실패:', saveError);
            setError('녹음 저장에 실패했습니다');
            // 백엔드 저장 실패해도 로컬 데이터로 계속
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
            audioRecordingId: audioRecordingId || undefined, // Include audio recording ID for timeline
          };

          // 상태 초기화
          setIsRecording(false);
          isRecordingRef.current = false; // 🔥 FIX: Update ref
          setIsPaused(false);
          setRecordingTime(0);
          audioChunksRef.current = [];

          resolve(recordingData);
        } catch (error) {
          log.error('stopRecording 오류:', error);
          reject(error);
        }
      };

      // 녹음 종료 - /transcription 패턴 따라 stop()만 호출
      // ondataavailable에서 자동으로 마지막 데이터를 수집함
      log.debug('녹음 중지 중... 현재 청크:', audioChunksRef.current.length);
      mediaRecorderRef.current.stop();
    });
  }, [recordingTime, setScriptSegments, queryClient, noteId]);

  // 녹음 취소
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // 데이터 요청 없이 중지 - 어차피 폐기할 데이터
      mediaRecorderRef.current.stop();
      log.debug('녹음 취소됨');
    }

    // 음성 인식 중단
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
      speechRecognitionRef.current = null;
      log.debug('음성 인식 중단됨');
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

    // 스크립트 세그먼트 정리
    clearScriptSegments();

    // 상태 초기화
    setIsRecording(false);
    isRecordingRef.current = false; // ref 업데이트
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

  // 페이지 이동 시 경고 + 자동 저장
  useEffect(() => {
    if (!isRecording) return;

    log.debug('🎤 녹음 활성 - beforeunload 핸들러 설정');

    let isSavingOnExit = false; // 중복 저장 방지 플래그

    // 1. beforeunload 이벤트로 경고 표시
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set

      // 페이지를 떠나기 전 자동 저장 시도 (visibilitychange가 먼저 처리될 수도 있음)
      if (!isSavingOnExit && mediaRecorderRef.current?.state !== 'inactive') {
        isSavingOnExit = true;
        log.debug('⚠️ beforeunload: 녹음 저장 시도 중...');

        // 자동 저장 제목 생성
        const autoSaveTitle = recordingStartTime
          ? `자동저장_${recordingStartTime.getFullYear()}_${String(recordingStartTime.getMonth() + 1).padStart(2, '0')}_${String(recordingStartTime.getDate()).padStart(2, '0')}_${String(recordingStartTime.getHours()).padStart(2, '0')}:${String(recordingStartTime.getMinutes()).padStart(2, '0')}:${String(recordingStartTime.getSeconds()).padStart(2, '0')}`
          : `자동저장_${new Date().toISOString()}`;

        // 녹음 중단 및 저장 (비동기지만 최선의 노력)
        stopRecording(autoSaveTitle).catch((err) => {
          log.error('beforeunload에서 자동 저장 실패:', err);
        });
      }

      return ''; // For other browsers
    };

    // 2. visibilitychange 이벤트로 페이지 숨김 시 자동 저장
    const handleVisibilityChange = async () => {
      // 페이지가 숨겨지고(hidden) 녹음 중이면 자동 저장
      if (document.hidden && isRecording && !isSavingOnExit && mediaRecorderRef.current?.state !== 'inactive') {
        isSavingOnExit = true;
        log.debug('👁️ 페이지 숨김 - 녹음 자동 저장 중...');

        try {
          // 자동 저장 제목 생성
          const autoSaveTitle = recordingStartTime
            ? `자동저장_${recordingStartTime.getFullYear()}_${String(recordingStartTime.getMonth() + 1).padStart(2, '0')}_${String(recordingStartTime.getDate()).padStart(2, '0')}_${String(recordingStartTime.getHours()).padStart(2, '0')}:${String(recordingStartTime.getMinutes()).padStart(2, '0')}:${String(recordingStartTime.getSeconds()).padStart(2, '0')}`
            : `자동저장_${new Date().toISOString()}`;

          await stopRecording(autoSaveTitle);
          log.debug('✅ 녹음 자동 저장 성공');
        } catch (error) {
          log.error('❌ visibilitychange에서 자동 저장 실패:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. 정리: 컴포넌트 unmount 시 리소스 정리
    return () => {
      log.debug('🧹 컴포넌트 unmount 중...');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // 녹음 중이면 리소스 정리 (저장은 beforeunload/visibilitychange에서 처리됨)
      // stale closure 방지를 위해 state 대신 ref 사용
      if (isRecordingRef.current && !isSavingOnExit) {
        log.debug('⚠️ unmount 중 녹음 활성 - 리소스 정리 중');

        // 음성 인식 중단
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.abort();
          speechRecognitionRef.current = null;
          log.debug('🗣️ 음성 인식 중지됨');
        }

        // 스트림 정리 (마이크 끄기)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            log.debug('🎤 마이크 트랙 중지:', track.label);
            track.stop();
          });
          streamRef.current = null;
        }

        // 타이머 정리
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          log.debug('⏱️ 타이머 정리됨');
        }

        log.debug('✅ 리소스 정리 완료');
      }
    };
  }, []); // dependency 제거 - mount/unmount 시에만 cleanup 실행

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordingStartTime, // Export recording start time
    formattedTime: formatTime(recordingTime),
    error,
    isSaving,
    audioRecordingId, // Export audio recording ID for timeline events
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}