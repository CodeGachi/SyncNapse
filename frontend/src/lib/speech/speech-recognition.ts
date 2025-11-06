export interface SpeechSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
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
      console.log('[SpeechRecognition] Started');
      this.isRunning = true;
      this.startTimestamp = Date.now();
      this.lastSegmentEndTime = 0;
      this.callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
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
      const relativeEndTime = (now - this.startTimestamp) / 1000;
      const relativeStartTime = this.lastSegmentEndTime;
      
      const segment: SpeechSegment = {
        id: isFinal
          ? `final-${now}`
          : `interim-${now}`,
        text: transcript.trim(),
        startTime: relativeStartTime,
        endTime: relativeEndTime,
        isPartial: !isFinal,
        confidence: confidence || undefined,
        language: this.detectedLanguage || detectedLang,
      };

      if (isFinal && transcript.trim() !== this.lastFinalText) {
        this.lastFinalText = transcript.trim();
        this.lastSegmentEndTime = relativeEndTime;
        console.log(`[SpeechRecognition] Final: "${segment.text}" (${segment.language}) at ${relativeStartTime.toFixed(2)}s - ${relativeEndTime.toFixed(2)}s`);
        this.callbacks.onSegment?.(segment);
      } else if (!isFinal) {
        console.log(`[SpeechRecognition] Interim: "${segment.text}"`);
        this.callbacks.onSegment?.(segment);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('[SpeechRecognition] No speech detected, continuing...');
        return;
      }

      const error = new Error(`Speech recognition error: ${event.error}`);
      this.callbacks.onError?.(error);
    };

    this.recognition.onend = () => {
      console.log('[SpeechRecognition] Ended');
      this.isRunning = false;
      this.callbacks.onEnd?.();

      if (this.config.continuous && this.isRunning !== false) {
        console.log('[SpeechRecognition] Auto-restarting...');
        setTimeout(() => {
          if (this.recognition) {
            this.start();
          }
        }, 100);
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
