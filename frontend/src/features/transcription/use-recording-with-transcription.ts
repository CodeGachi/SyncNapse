'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SpeechRecognitionService, SpeechSegment } from '@/lib/speech/speech-recognition';

// Type compatibility with existing TranscriptionSegment
type TranscriptionSegment = SpeechSegment;

// STT (Speech-to-Text) timing calibration offset
// Web Speech API detects speech slightly AFTER it actually starts
// This offset compensates for that delay when saving to database
// Typical delay: 0.2-0.3 seconds
const STT_TIMING_OFFSET = 0.25; // 250ms offset for better accuracy

// Estimate word-level timestamps from a segment
// NOTE: Web Speech API doesn't provide word-level timestamps,
// so we estimate them based on word length and average speaking rate
// Each word only has startTime (endTime not needed for DB)
function estimateWordTimestamps(
  text: string,
  startTime: number,
  confidence: number = 1.0
): Array<{ word: string; startTime: number; confidence: number; wordIndex: number }> {
  // Split text into words (handle multiple languages)
  const words = text.trim().split(/\s+/);
  
  if (words.length === 0) return [];
  
  // Estimate duration based on average speaking rate
  // Average speaking rate: ~2.5 words per second (Korean), ~2 words per second (English)
  const estimatedDuration = words.length / 2.5;
  
  // Calculate average time per character for better estimation
  const totalChars = words.reduce((sum, word) => sum + word.length, 0);
  const timePerChar = estimatedDuration / totalChars;
  
  const wordTimestamps = [];
  let currentTime = startTime;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordDuration = word.length * timePerChar;
    
    wordTimestamps.push({
      word,
      startTime: currentTime,
      confidence,
      wordIndex: i,
    });
    
    currentTime += wordDuration;
  }
  
  return wordTimestamps;
}
import {
  createSession,
  endSession,
  saveAudioChunk,
  saveTranscript,
  saveFullAudio,
} from '@/lib/api/transcription.api';
import {
  saveSession,
  saveSegment,
  saveAudioChunkLocal,
  saveWords,
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

  // Save full audio mutation (for complete audio file)
  const saveFullAudioMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await saveFullAudio(data);
      console.log('[RecordingWithTranscription] ✅ Full audio saved to MinIO + PostgreSQL');
      return result;
    },
    onError: (error) => {
      console.error('[RecordingWithTranscription] ❌ Failed to save full audio to backend:', error);
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

        // Create transcription session with timestamp-based title if not provided
        let sessionTitle = title;
        if (!sessionTitle) {
          // Format: YYYY_MM_DD_HH:MM:SS (with leading zeros)
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          
          sessionTitle = `${year}_${month}_${day}_${hours}:${minutes}:${seconds}`;
          console.log('[RecordingWithTranscription] Generated default title:', sessionTitle);
        }
        
        const session = await createSessionMutation.mutateAsync(sessionTitle);

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
                confidence: segment.confidence,
                isPartial: segment.isPartial,
              });
              
              // Add to local state (accumulate segments from same startTime)
              setSegments((prev) => {
                if (!segment.isPartial) {
                  // Final segment: remove all partials with same startTime and add final one
                  const filteredSegments = prev.filter(s => 
                    !s.isPartial && Math.abs(s.startTime - segment.startTime) > 0.1 // Keep other final segments
                  );
                  console.log('[RecordingWithTranscription] ✅ Final segment - keeping accumulated text');
                  return [...filteredSegments, segment];
                }
                
                // Partial segment: find previous partial with same startTime and accumulate text
                const existingPartialIndex = prev.findIndex(s => 
                  s.isPartial && Math.abs(s.startTime - segment.startTime) < 0.1 // Same startTime (within 0.1s tolerance)
                );
                
                if (existingPartialIndex >= 0) {
                  // Found existing partial with same startTime
                  const existingPartial = prev[existingPartialIndex];
                  
                  // Smart text merging: prefer text that contains the other
                  let bestText: string;
                  let reason: string;
                  
                  // Check if new text contains existing text (new is more complete)
                  if (segment.text.includes(existingPartial.text)) {
                    bestText = segment.text;
                    reason = 'new contains existing';
                  }
                  // Check if existing text contains new text (existing is more complete)
                  else if (existingPartial.text.includes(segment.text)) {
                    bestText = existingPartial.text;
                    reason = 'existing contains new';
                  }
                  // Try to find overlapping text and merge intelligently
                  else {
                    // Find longest common substring at the end of existing and start of new
                    let overlap = '';
                    const minLen = Math.min(existingPartial.text.length, segment.text.length);
                    
                    for (let len = minLen; len > 0; len--) {
                      const existingEnd = existingPartial.text.slice(-len);
                      const newStart = segment.text.slice(0, len);
                      
                      if (existingEnd === newStart) {
                        overlap = existingEnd;
                        break;
                      }
                    }
                    
                    if (overlap.length > 0) {
                      // Found overlap: merge by removing duplicate
                      bestText = existingPartial.text + segment.text.slice(overlap.length);
                      reason = `merged with overlap: "${overlap}"`;
                    } else {
                      // No overlap, use the longer one
                      bestText = existingPartial.text.length > segment.text.length 
                        ? existingPartial.text 
                        : segment.text;
                      reason = 'length comparison';
                    }
                  }
                  
                  console.log('[RecordingWithTranscription] 💭 Partial segment - accumulating text:', {
                    existing: existingPartial.text,
                    new: segment.text,
                    kept: bestText,
                    reason: reason,
                    originalStartTime: existingPartial.startTime, // Keep original start time
                    newStartTime: segment.startTime,
                  });
                  
                  // Create updated segment with best text
                  // IMPORTANT: Use existing partial's startTime (when sentence FIRST started)
                  const updatedSegment = {
                    ...existingPartial, // Keep original properties including startTime
                    text: bestText, // Update text
                    confidence: segment.confidence ?? existingPartial.confidence, // Update confidence if available
                  };
                  
                  // Replace existing partial with updated one
                  const newSegments = [...prev];
                  newSegments[existingPartialIndex] = updatedSegment;
                  return newSegments;
                } else {
                  // No existing partial with same startTime, add as new segment
                  console.log('[RecordingWithTranscription] 💭 New partial segment:', segment.text);
                  return [...prev, segment];
                }
              });

              // Store FINAL segments to send to backend when recording stops
              if (!segment.isPartial) {
                console.log('[RecordingWithTranscription] ✅ Final segment stored (will send to backend on stop)');
                console.log('[RecordingWithTranscription] 🔍 DEBUG - Before push, finalSegmentsRef.current.length:', finalSegmentsRef.current.length);
                finalSegmentsRef.current.push(segment);
                console.log('[RecordingWithTranscription] 🔍 DEBUG - After push, finalSegmentsRef.current.length:', finalSegmentsRef.current.length);
                console.log('[RecordingWithTranscription] 🔍 DEBUG - Pushed segment:', {
                  text: segment.text,
                  startTime: segment.startTime,
                  isPartial: segment.isPartial
                });
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

  // Stop recording and transcription
  const stopRecording = useCallback(async () => {
    try {
      console.log('[RecordingWithTranscription] Stopping recording...');
      console.log('[RecordingWithTranscription] 🔍 DEBUG - At stop start, finalSegmentsRef.current.length:', finalSegmentsRef.current.length);

      // Stop speech recognition FIRST and wait for final results
      if (speechRecognitionRef.current) {
        console.log('[RecordingWithTranscription] 🔍 DEBUG - Stopping speech recognition...');
        speechRecognitionRef.current.stop();
        
        // IMPORTANT: Wait for speech recognition to process final results
        // Web Speech API sends final results AFTER stop() is called
        console.log('[RecordingWithTranscription] 🔍 DEBUG - Waiting 1000ms for final speech results...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('[RecordingWithTranscription] 🔍 DEBUG - After waiting, finalSegmentsRef.current.length:', finalSegmentsRef.current.length);
      }

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
          
          // Cache full audio locally first for immediate access
          await updateSession(sessionId, {
            fullAudioBlob: audioBlob,
            duration: elapsedTime,
          });
          console.log('[RecordingWithTranscription] ✅ Full audio cached locally in session');
          
          // Also save as chunk for backward compatibility with older sessions
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
          console.log('[RecordingWithTranscription] ✅ Audio also cached as chunk (backward compatibility)');
          
          // Save full audio to backend (MinIO storage + PostgreSQL linking)
          // Convert Blob to data URL for upload
          const reader = new FileReader();
          reader.onloadend = async () => {
            const audioUrl = reader.result as string;
            await saveFullAudioMutation.mutateAsync({
              sessionId: sessionId!,
              audioUrl,
              duration: elapsedTime,
            });
            console.log('[RecordingWithTranscription] ✅ Full audio file uploaded to MinIO');
          };
          reader.readAsDataURL(audioBlob);
        }

        mediaRecorderRef.current = null;
      }

      // Stop audio level animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        console.log('[RecordingWithTranscription] Audio level visualization stopped');
      }

      // Dispose speech recognition (already stopped above)
      if (speechRecognitionRef.current) {
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

      // DEBUG: Check finalSegmentsRef state before sending to backend
      console.log('[RecordingWithTranscription] 🔍 DEBUG - finalSegmentsRef.current:', {
        count: finalSegmentsRef.current.length,
        segments: finalSegmentsRef.current.map(s => ({
          text: s.text,
          startTime: s.startTime,
          isPartial: s.isPartial
        }))
      });
      
      // Send all final segments to backend at once
      if (sessionId && finalSegmentsRef.current.length > 0) {
        console.log(`[RecordingWithTranscription] 📤 Sending ${finalSegmentsRef.current.length} final segments to backend...`);
        
        // Send all segments sequentially (can be optimized to batch API if needed)
        for (const segment of finalSegmentsRef.current) {
          try {
            // Extract language code (e.g., 'ko-KR' -> 'ko', 'en-US' -> 'en')
            const langCode = segment.language ? segment.language.split('-')[0] : 'ko';
            
            // Apply STT timing calibration offset
            // Web Speech API detects speech ~250ms after it actually starts
            // Subtract offset, but ensure it doesn't go below 0
            const calibratedStartTime = Math.max(0, segment.startTime - STT_TIMING_OFFSET);
            
            console.log(`[RecordingWithTranscription] ⏰ Timing calibration: ${segment.startTime.toFixed(3)}s → ${calibratedStartTime.toFixed(3)}s (offset: -${STT_TIMING_OFFSET}s)`);
            
            // Estimate word-level timestamps for this segment (using calibrated time)
            const words = estimateWordTimestamps(
              segment.text,
              calibratedStartTime,
              segment.confidence ?? 1.0
            );
            
            console.log(`[RecordingWithTranscription] Estimated ${words.length} word timestamps for segment`);
            
            const payload = {
              sessionId: sessionId,
              text: segment.text,
              startTime: calibratedStartTime, // Use calibrated time
              // endTime removed - not needed for playback (plays from startTime to end)
              confidence: segment.confidence ?? 1.0,
              isPartial: false,
              language: langCode,
              words: words.map(w => ({
                word: w.word,
                startTime: w.startTime,
                confidence: w.confidence,
                wordIndex: w.wordIndex,
              })),
            };
            
            const savedSegment = await saveTranscriptMutation.mutateAsync(payload);
            console.log(`[RecordingWithTranscription] ✅ Segment saved with ${words.length} words: "${segment.text}"`);
            
            // Save words to local cache if segment has an ID
            if (savedSegment.id && words.length > 0) {
              await saveWords(words.map(w => ({
                id: `word-${savedSegment.id}-${w.wordIndex}`,
                segmentId: savedSegment.id,
                word: w.word,
                startTime: w.startTime,
                confidence: w.confidence,
                wordIndex: w.wordIndex,
                createdAt: new Date().toISOString(),
              })));
              console.log(`[RecordingWithTranscription] ✅ ${words.length} words cached locally`);
            }
          } catch (error) {
            console.error('[RecordingWithTranscription] ❌ Failed to save segment:', error);
          }
        }
        
        console.log('[RecordingWithTranscription] ✅ All segments sent to backend');
      } else {
        console.warn('[RecordingWithTranscription] ⚠️ WARNING: No final segments to send to backend!');
        console.warn('[RecordingWithTranscription] 🔍 DEBUG - sessionId:', sessionId);
        console.warn('[RecordingWithTranscription] 🔍 DEBUG - finalSegmentsRef.current.length:', finalSegmentsRef.current.length);
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

  // Clear current recording
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

