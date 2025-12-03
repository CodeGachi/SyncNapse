export interface SpeechSegment {
  id: string;
  text: string;
  startTime: number; // Actual time when speech was detected (in seconds)
  endTime?: number; // Optional: not used for real-time segments
  isPartial: boolean;
  confidence?: number;
  language?: string;
}

export interface SpeechRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoDetectLanguage?: boolean;
  languageOptions?: string[];
}

export interface SpeechRecognitionCallbacks {
  onSegment?: (segment: SpeechSegment) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private config: SpeechRecognitionConfig;
  private callbacks: SpeechRecognitionCallbacks;
  private isRunning = false;
  private startTimestamp = 0;
  private lastFinalText = '';
  private detectedLanguage: string | null = null;
  private lastSegmentEndTime = 0;
  private currentSegmentStartTime = 0; // Track current segment start for accumulation
  private lastSpeechTime = 0; // Track last speech time for silence detection
  private silenceThreshold = 2000; // 2 seconds of silence = new segment
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelay = 1000; // Start with 1 second delay
  private isFirstStart = true; // Track if this is the initial start or a restart

  constructor(
    config: SpeechRecognitionConfig = {},
    callbacks: SpeechRecognitionCallbacks = {},
  ) {
    this.config = {
      language: config.language || 'ko-KR',
      continuous: config.continuous !== false,
      interimResults: config.interimResults !== false,
      maxAlternatives: config.maxAlternatives || 1,
    };
    this.callbacks = callbacks;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error(
        'Web Speech API is not supported in this browser. Use Chrome or Edge.',
      );
    }

    this.initializeRecognition();
  }

  private initializeRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onstart = () => {
      this.isRunning = true;
      
      // IMPORTANT: Only reset timestamps on the FIRST start, not on auto-restarts
      // This ensures timestamps are continuous across speech recognition restarts
      if (this.isFirstStart) {
        console.log('[SpeechRecognition] ✅ Initial start - recording from 0:00');
        this.startTimestamp = Date.now();
        this.lastSegmentEndTime = 0;
        this.currentSegmentStartTime = 0;
        this.lastSpeechTime = Date.now();
        this.isFirstStart = false;
        this.callbacks.onStart?.();
      } else {
        const elapsedTime = ((Date.now() - this.startTimestamp) / 1000).toFixed(2);
        console.log('[SpeechRecognition] 🔄 Auto-restart - preserving timeline', {
          elapsedTime: elapsedTime + 's',
          lastSegmentEndTime: this.lastSegmentEndTime.toFixed(2) + 's',
        });
        // Update lastSpeechTime to avoid false silence detection after restart
        this.lastSpeechTime = Date.now();
      }
    };

    this.recognition.onresult = (event: any) => {
      // Reset retry count on successful result (connection is working)
      this.retryCount = 0;
      
      const results = event.results;
      const lastResult = results[results.length - 1];
      const transcript = lastResult[0].transcript;
      const confidence = lastResult[0].confidence;
      const isFinal = lastResult.isFinal;

      let detectedLang = this.config.language || 'ko-KR';
      if (this.config.autoDetectLanguage && isFinal) {
        detectedLang = this.detectLanguage(transcript.trim());
        this.detectedLanguage = detectedLang;
        console.log(`[SpeechRecognition] 🌐 Detected language: ${detectedLang}`);
      }

      const now = Date.now();
      // Calculate actual time from recording start
      const currentAudioTime = (now - this.startTimestamp) / 1000;
      
      // Set start time ONLY ONCE when segment begins (currentSegmentStartTime === 0)
      // Do NOT update during interim results or after silence!
      // The segment ends only when Web Speech API gives us a FINAL result
      if (this.currentSegmentStartTime === 0) {
        this.currentSegmentStartTime = currentAudioTime;
        console.log(`[SpeechRecognition] 🎬 Segment starting at ${this.currentSegmentStartTime.toFixed(2)}s`);
      }
      
      // Update last speech time for continuous recording
      this.lastSpeechTime = now;
      
      const segment: SpeechSegment = {
        id: isFinal
          ? `final-${now}`
          : `interim-${now}`,
        text: transcript.trim(),
        startTime: this.currentSegmentStartTime, // Actual time when speech started
        // endTime removed - not needed for linking
        isPartial: !isFinal,
        confidence: confidence || undefined,
        language: this.detectedLanguage || detectedLang,
      };

      if (isFinal && transcript.trim() !== this.lastFinalText) {
        this.lastFinalText = transcript.trim();
        this.lastSegmentEndTime = currentAudioTime;
        // Reset for next segment (will be set to actual time when new speech detected)
        this.currentSegmentStartTime = 0;
        console.log(`[SpeechRecognition] Final: "${segment.text}" (${segment.language}) at ${segment.startTime.toFixed(2)}s`);
        this.callbacks.onSegment?.(segment);
      } else if (!isFinal) {
        console.log(`[SpeechRecognition] Interim: "${segment.text}" at ${segment.startTime.toFixed(2)}s`);
        this.callbacks.onSegment?.(segment);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error);
      
      // Ignore 'no-speech' error and continue
      if (event.error === 'no-speech') {
        console.log('[SpeechRecognition] No speech detected, continuing...');
        return;
      }

      // Handle 'aborted' error (user manually stopped)
      if (event.error === 'aborted') {
        console.log('[SpeechRecognition] Aborted by user');
        this.isRunning = false;
        return;
      }

      // Handle network errors with retry logic
      if (event.error === 'network') {
        console.error('[SpeechRecognition] ❌ Network error - Google Speech API unreachable');
        
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          const delay = this.retryDelay * this.retryCount; // Exponential backoff
          console.log(`[SpeechRecognition] 🔄 Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})...`);
          
          setTimeout(() => {
            if (this.recognition && this.isRunning) {
              console.log('[SpeechRecognition] 🔄 Restarting after network error...');
              try {
                this.recognition.start();
              } catch (err) {
                console.error('[SpeechRecognition] Failed to restart:', err);
              }
            }
          }, delay);
          return;
        } else {
          console.error('[SpeechRecognition] ❌ Max retries reached. Please check your internet connection.');
          const error = new Error('Speech recognition network error: Unable to reach Google Speech API. Please check your internet connection.');
          this.callbacks.onError?.(error);
          this.isRunning = false;
          return;
        }
      }

      // Handle other errors
      const error = new Error(`Speech recognition error: ${event.error}`);
      this.callbacks.onError?.(error);
    };

    this.recognition.onend = () => {
      console.log('[SpeechRecognition] Ended, isRunning:', this.isRunning);
      
      // If we're still supposed to be running (continuous mode), restart
      if (this.isRunning && this.config.continuous) {
        console.log('[SpeechRecognition] 🔄 Auto-restarting (continuous mode)...');
        setTimeout(() => {
          if (this.recognition && this.isRunning) {
            try {
              this.recognition.start();
              console.log('[SpeechRecognition] ✅ Restarted successfully');
            } catch (err) {
              console.error('[SpeechRecognition] ❌ Failed to restart:', err);
              // If already running, ignore the error
              if ((err as Error).message?.includes('already started')) {
                console.log('[SpeechRecognition] Already running, ignoring error');
              }
            }
          }
        }, 100);
      } else {
        console.log('[SpeechRecognition] Not restarting (isRunning:', this.isRunning, ', continuous:', this.config.continuous, ')');
        this.isRunning = false;
        this.callbacks.onEnd?.();
      }
    };
  }

  start() {
    if (this.isRunning) {
      console.warn('[SpeechRecognition] Already running');
      return;
    }

    try {
      this.lastFinalText = '';
      this.lastSegmentEndTime = 0;
      this.retryCount = 0; // Reset retry count on new start
      this.isFirstStart = true; // Mark this as a fresh start (not an auto-restart)
      console.log('[SpeechRecognition] 🎬 Starting fresh recording session');
      this.recognition.start();
    } catch (error) {
      console.error('[SpeechRecognition] Start failed:', error);
      throw error;
    }
  }

  stop() {
    if (!this.isRunning) {
      console.warn('[SpeechRecognition] Not running');
      return;
    }

    try {
      this.isRunning = false;
      this.recognition.stop();
    } catch (error) {
      console.error('[SpeechRecognition] Stop failed:', error);
    }
  }

  abort() {
    try {
      this.isRunning = false;
      this.recognition.abort();
    } catch (error) {
      console.error('[SpeechRecognition] Abort failed:', error);
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getDetectedLanguage(): string | null {
    return this.detectedLanguage;
  }

  setLanguage(language: string) {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
      console.log(`[SpeechRecognition] Language changed to: ${language}`);
    }
  }

  private detectLanguage(text: string): string {
    if (/[\u3131-\u3163\uAC00-\uD7A3]/.test(text)) {
      return 'ko-KR';
    }
    
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
      return 'ja-JP';
    }
    
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'zh-CN';
    }
    
    return 'en-US';
  }

  dispose() {
    this.stop();
    this.recognition = null;
  }
}
