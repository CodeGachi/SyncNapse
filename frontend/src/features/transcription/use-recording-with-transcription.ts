/**
 * Recording with Transcription Hook
 * Integrates audio recording, real-time transcription, and automatic saving
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SpeechRecognitionService, SpeechSegment } from '@/lib/speech/speech-recognition';

// Type compatibility with existing TranscriptionSegment
type TranscriptionSegment = SpeechSegment;
import {
  createSession,
  endSession,
  saveAudioChunk,
  saveTranscript,
} from '@/lib/api/transcription.api';
import {
  saveSession,
  saveSegment,
  saveAudioChunkLocal,
  updateSession,
} from '@/lib/storage/transcription-storage';

export function useRecordingWithTranscription() {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Store final segments separately to send to backend on stop
  const finalSegmentsRef = useRef<TranscriptionSegment[]>([]);

  const speechRecognitionRef = useRef<SpeechRecognitionService | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Create session mutation (backend-first with local cache)
  const createSessionMutation = useMutation({
    mutationFn: async (title: string) => {
      // Create session on backend FIRST
      const backendSession = await createSession(title);
      console.log('[RecordingWithTranscription] ✅ Session created on backend:', backendSession.id);
      
      // Cache in IndexedDB for fast access
      const localSession = {
        id: backendSession.id,
        title,
        startTime: Date.now(),
        duration: 0,
        createdAt: new Date().toISOString(),
      };
      
      await saveSession(localSession);
      console.log('[RecordingWithTranscription] ✅ Session cached locally');
      
      return backendSession;
    },
    onSuccess: (session) => {
      console.log('[RecordingWithTranscription] Session created:', session.id);
      setSessionId(session.id);
    },
    onError: (error) => {
      console.error('[RecordingWithTranscription] ❌ Failed to create session on backend:', error);
      throw error;
    },
  });

  // End session mutation (backend-first)
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      // End session on backend
      const result = await endSession(sessionId);
      console.log('[RecordingWithTranscription] ✅ Session ended on backend');
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transcription-sessions'] });
      console.log('[RecordingWithTranscription] ✅ Session data synced');
    },
    onError: (error) => {
      console.error('[RecordingWithTranscription] ❌ Failed to end session on backend:', error);
    },
  });

  // Save audio chunk mutation (backend-first for MinIO storage)
  const saveAudioChunkMutation = useMutation({
    mutationFn: async (data: any) => {
      // Save to backend (MinIO + PostgreSQL) FIRST
      const result = await saveAudioChunk(data);
      console.log('[RecordingWithTranscription] ✅ Audio chunk saved to MinIO + PostgreSQL');
      
      return result;
    },
    onError: (error) => {
      console.error('[RecordingWithTranscription] ❌ Failed to save audio chunk to backend:', error);
    },
  });

  // Save transcript mutation (backend-first with local cache)
  const saveTranscriptMutation = useMutation({
    mutationFn: async (data: any) => {
      // Save to backend FIRST (required for permanent storage)
      const backendSegment = await saveTranscript(data);
      console.log('[RecordingWithTranscription] ✅ Transcript saved to backend:', backendSegment.text);
      
      // Cache locally for fast access (including new fields: isPartial, language)
      await saveSegment({
        id: backendSegment.id || `segment-${Date.now()}-${Math.random()}`,
        sessionId: data.sessionId,
        text: data.text,
        startTime: data.startTime,
        endTime: data.endTime,
        confidence: data.confidence || 1.0,
        isPartial: data.isPartial ?? false,
        language: data.language || 'ko',
        createdAt: new Date().toISOString(),
      });
      console.log('[RecordingWithTranscription] ✅ Transcript cached locally');
      
      return backendSegment;
    },
    onSuccess: (segment) => {
      if (segment) {
        console.log('[RecordingWithTranscription] Transcript saved with linking:', segment.text);
      }
    },
    onError: (error) => {
      console.error('[RecordingWithTranscription] ❌ Failed to save transcript to backend:', error);
    },
  });

  /**
   * Start recording and transcription (using Web Speech API)
   */
  const startRecording = useCallback(
    async (title?: string, options?: { language?: string; autoDetectLanguage?: boolean }) => {
      try {
        setError(null); // Clear any previous errors
        
        const language = options?.language || 'ko-KR';
        const autoDetect = options?.autoDetectLanguage || false;
        
        console.log('[RecordingWithTranscription] Starting recording with Web Speech API...');
        console.log(`[RecordingWithTranscription] Language: ${language}, Auto-detect: ${autoDetect}`);

        // Create transcription session
        const session = await createSessionMutation.mutateAsync(
          title || `Recording ${new Date().toLocaleString('ko-KR')}`
        );

        setSessionId(session.id);
        startTimeRef.current = Date.now();
        chunkIndexRef.current = 0;
        audioChunksRef.current = [];
        finalSegmentsRef.current = []; // Reset final segments for new recording

        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        mediaStreamRef.current = stream;

        // Initialize Web Speech API
        const speechRecognition = new SpeechRecognitionService(
          {
            language: language,
            continuous: true,
            interimResults: true,
            autoDetectLanguage: autoDetect,
          },
          {
            onSegment: async (segment) => {
              console.log('[RecordingWithTranscription] 🎤 New segment:', {
                text: segment.text,
                startTime: segment.startTime,
                endTime: segment.endTime,
                confidence: segment.confidence,
                isPartial: segment.isPartial,
              });
              
              // Add to local state (show all segments including partial)
              setSegments((prev) => {
                // If it's a final segment, remove all partial segments and add the final one
                if (!segment.isPartial) {
                  const filteredSegments = prev.filter(s => !s.isPartial);
                  return [...filteredSegments, segment];
                }
                // If it's partial, replace previous partial with new one
                const withoutPartials = prev.filter(s => !s.isPartial);
                return [...withoutPartials, segment];
              });

              // Store FINAL segments to send to backend when recording stops
              if (!segment.isPartial) {
                console.log('[RecordingWithTranscription] ✅ Final segment stored (will send to backend on stop)');
                finalSegmentsRef.current.push(segment);
              } else {
                console.log('[RecordingWithTranscription] 💭 Partial segment (UI only)');
              }
            },
            onError: (error) => {
              console.error('[RecordingWithTranscription] Speech recognition error:', error);
              
              // Show error to user (network errors are critical)
              if (error.message.includes('network')) {
                setError('네트워크 오류: Google 음성 인식 서비스에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.');
              } else {
                setError(`음성 인식 오류: ${error.message}`);
              }
            },
            onStart: () => {
              console.log('[RecordingWithTranscription] Speech recognition started');
              setError(null); // Clear any previous errors
            },
          },
        );

        speechRecognition.start();
        speechRecognitionRef.current = speechRecognition;

        // Setup audio level visualization
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Start audio level animation loop (60fps)
        const updateAudioLevel = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteTimeDomainData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const normalized = (dataArray[i] - 128) / 128;
              sum += normalized * normalized;
            }

            const rms = Math.sqrt(sum / dataArray.length);
            setAudioLevel(Math.min(1, rms * 5));
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();

        // Initialize MediaRecorder for saving audio
        // Use explicit codec for better browser compatibility
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 128000, // 128kbps for good quality
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            console.log('[RecordingWithTranscription] Audio chunk received:', event.data.size, 'bytes');
          }
        };

        // Start recording without timeslice - get complete data only at stop
        // This ensures we get a valid, complete webm file
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        
        console.log('[RecordingWithTranscription] MediaRecorder started with mimeType:', mimeType);

        setIsRecording(true);
        console.log('[RecordingWithTranscription] Recording started with Web Speech API');
      } catch (error) {
        console.error('[RecordingWithTranscription] Start failed:', error);
        throw error;
      }
    },
    [createSessionMutation],
  );

  /**
   * Stop recording and transcription
   */
  const stopRecording = useCallback(async () => {
    try {
      console.log('[RecordingWithTranscription] Stopping recording...');

      // Stop media recorder
      if (mediaRecorderRef.current) {
        const mimeType = mediaRecorderRef.current.mimeType;
        
        // Wait for the stop event to ensure all data is available
        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
              console.log('[RecordingWithTranscription] MediaRecorder stopped, data available');
              resolve();
            };
            mediaRecorderRef.current.stop();
          } else {
            resolve();
          }
        });
        
        // Additional safety delay
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Save audio chunks to backend (MinIO + PostgreSQL)
        if (audioChunksRef.current.length > 0 && sessionId) {
          // Use the same mimeType that was used for recording
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
          
          console.log('[RecordingWithTranscription] Created audio blob:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: audioChunksRef.current.length,
            duration: elapsedTime,
          });
          
          // Test: Verify the blob is a valid audio file by playing it locally
          const testUrl = URL.createObjectURL(audioBlob);
          const testAudio = new Audio(testUrl);
          testAudio.addEventListener('loadeddata', () => {
            console.log('[RecordingWithTranscription] ✅ Audio blob is valid! Can play locally. Duration:', testAudio.duration);
            URL.revokeObjectURL(testUrl);
          });
          testAudio.addEventListener('error', (e) => {
            console.error('[RecordingWithTranscription] ❌ Audio blob is INVALID! Cannot play locally:', testAudio.error);
            URL.revokeObjectURL(testUrl);
          });
          testAudio.load();
          
          // Cache locally first for immediate access
          await saveAudioChunkLocal({
            id: `chunk-${sessionId}-${chunkIndexRef.current}`,
            sessionId: sessionId,
            chunkIndex: chunkIndexRef.current,
            blob: audioBlob,
            startTime: 0,
            endTime: elapsedTime,
            duration: elapsedTime,
            createdAt: new Date().toISOString(),
          });
          console.log('[RecordingWithTranscription] ✅ Audio cached locally');
          
          // Save to backend (MinIO storage + PostgreSQL linking)
          const reader = new FileReader();
          reader.onloadend = async () => {
            const audioUrl = reader.result as string;
            await saveAudioChunkMutation.mutateAsync({
              sessionId: sessionId!,
              chunkIndex: chunkIndexRef.current,
              startTime: 0,
              endTime: elapsedTime,
              duration: elapsedTime,
              sampleRate: 16000,
              audioUrl,
            });
          };
          reader.readAsDataURL(audioBlob);
          
          chunkIndexRef.current++;
        }

        mediaRecorderRef.current = null;
      }

      // Stop audio level animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        console.log('[RecordingWithTranscription] Audio level visualization stopped');
      }

      // Stop speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current.dispose();
        speechRecognitionRef.current = null;
      }

      // Stop audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Send all final segments to backend at once
      if (sessionId && finalSegmentsRef.current.length > 0) {
        console.log(`[RecordingWithTranscription] 📤 Sending ${finalSegmentsRef.current.length} final segments to backend...`);
        
        // Send all segments sequentially (can be optimized to batch API if needed)
        for (const segment of finalSegmentsRef.current) {
          try {
            // Extract language code (e.g., 'ko-KR' -> 'ko', 'en-US' -> 'en')
            const langCode = segment.language ? segment.language.split('-')[0] : 'ko';
            
            const payload = {
              sessionId: sessionId,
              text: segment.text,
              startTime: segment.startTime,
              endTime: segment.endTime,
              confidence: segment.confidence ?? 1.0, // Default to 1.0 if undefined
              isPartial: false,
              language: langCode,
            };
            
            await saveTranscriptMutation.mutateAsync(payload);
            console.log(`[RecordingWithTranscription] ✅ Segment saved: "${segment.text}"`);
          } catch (error) {
            console.error('[RecordingWithTranscription] ❌ Failed to save segment:', error);
          }
        }
        
        console.log('[RecordingWithTranscription] ✅ All segments sent to backend');
      }

      // End session
      if (sessionId) {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        
        // Update local cache
        await updateSession(sessionId, {
          endTime: Date.now(),
          duration,
        });
        console.log('[RecordingWithTranscription] ✅ Local cache updated');
        
        // End session on backend (required)
        await endSessionMutation.mutateAsync(sessionId);
      }

      setIsRecording(false);
      setAudioLevel(0);
      console.log('[RecordingWithTranscription] 🎉 Recording completed! All data saved to backend (PostgreSQL + MinIO)');
    } catch (error) {
      console.error('[RecordingWithTranscription] Stop failed:', error);
    }
  }, [sessionId, saveAudioChunkMutation, saveTranscriptMutation, endSessionMutation]);

  /**
   * Clear current recording
   */
  const clear = useCallback(() => {
    setSegments([]);
    setSessionId(null);
    setError(null);
    audioChunksRef.current = [];
    chunkIndexRef.current = 0;
    finalSegmentsRef.current = []; // Clear stored final segments
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop audio level animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Stop speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.dispose();
      }
      
      // Stop audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isRecording,
    sessionId,
    segments,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    clear,
  };
}

