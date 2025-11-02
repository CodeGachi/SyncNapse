/**
 * Recording & Translation Types
 * Recording, transcript, and translation related types
 */

// ============================================================================
// Language
// ============================================================================

/**
 * Language code
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
  | "ar" // Arabic
  | "pt"; // Portuguese

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
 * Script segment (text per timestamp)
 */
export interface ScriptSegment {
  id: string;
  timestamp: number; // Timestamp (ms)
  originalText: string;
  translatedText?: string;
  speaker?: string;
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
