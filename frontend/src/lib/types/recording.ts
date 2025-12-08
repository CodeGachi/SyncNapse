/**
 * Recording & Translation Types
 * Recording, transcript, and translation related types
 */

// ============================================================================
// Language
// ============================================================================

/**
 * Language code (DeepL 지원 언어)
 */
export type SupportedLanguage =
  | "ko" // Korean
  | "en" // English
  | "ja" // Japanese
  | "zh" // Chinese
  | "es" // Spanish
  | "fr" // French
  | "de" // German
  | "ru" // Russian
  | "pt" // Portuguese
  | "it" // Italian
  | "nl" // Dutch
  | "pl"; // Polish

/**
 * Language selection option
 */
export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

// ============================================================================
// Script (Transcript)
// ============================================================================

/**
 * Word with time information for word-level playback
 */
export interface WordWithTime {
  word: string;
  startTime: number; // Start time in seconds
  confidence?: number;
  wordIndex: number;
}

/**
 * Script segment (text per timestamp)
 */
export interface ScriptSegment {
  id: string;
  timestamp: number; // Timestamp (ms)
  originalText: string;
  translatedText?: string;
  speaker?: string;
  words?: WordWithTime[]; // Optional word-level timing for playback
  isPartial?: boolean; // True for interim results during recording
}

// ============================================================================
// Translation
// ============================================================================

/**
 * Translation settings
 */
export interface TranslationSettings {
  enabled: boolean;
  targetLanguage: SupportedLanguage;
  autoTranslate: boolean;
}

/**
 * Script data (transcript + translation)
 */
export interface ScriptData {
  segments: ScriptSegment[];
  originalLanguage: SupportedLanguage;
  translation?: TranslationSettings;
}

// ============================================================================
// Audio Timeline (녹음-필기 연동)
// ============================================================================

/**
 * 타임라인 이벤트 - 녹음 중 페이지 컨텍스트 기록
 */
export interface AudioTimelineEvent {
  id: string;
  recordingId: string;
  timestamp: number; // 초 단위
  fileId?: string;
  pageNumber?: number;
  createdAt: string;
}

/**
 * 페이지 컨텍스트 - 현재 재생 시간에 해당하는 파일/페이지
 * backendId (fileId)를 사용하여 안정적으로 파일 식별
 */
export interface PageContext {
  fileId?: string;    // Backend File ID (안정적인 파일 식별)
  pageNumber: number; // 페이지 번호 (1부터 시작)
}

/**
 * 녹음 데이터 (프론트엔드 저장용)
 * TranscriptionSession + AudioRecording 매핑
 */
export interface RecordingMapping {
  sessionId: string;          // TranscriptionSession ID
  audioRecordingId: string;   // AudioRecording ID (타임라인용)
  noteId: string;
  title: string;
  createdAt: string;
}
