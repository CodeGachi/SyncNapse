/**
 * Translation API Service
 * Chrome Translator API를 사용한 번역 서비스
 *
 * 특징:
 * - 클라이언트 사이드 로컬 AI 번역
 * - 무료, 무제한
 * - Chrome 138+ 전용
 *
 * @see https://developer.chrome.com/docs/ai/translator-api
 */

/// <reference path="../../types/chrome-translator.d.ts" />

// ============================================================================
// Types
// ============================================================================

/** 지원 언어 코드 (BCP 47) */
export type TranslatorLanguage =
  | 'ko'    // 한국어
  | 'en'    // 영어
  | 'ja'    // 일본어
  | 'zh'    // 중국어
  | 'es'    // 스페인어
  | 'fr'    // 프랑스어
  | 'de'    // 독일어
  | 'ru'    // 러시아어
  | 'pt'    // 포르투갈어
  | 'it'    // 이탈리아어
  | 'nl'    // 네덜란드어
  | 'pl';   // 폴란드어

export interface TranslationProgress {
  isDownloading: boolean;
  progress: number; // 0 to 100
}

// ============================================================================
// Translator Instance Cache
// ============================================================================

// 언어쌍별 Translator 인스턴스 캐시
const translatorCache = new Map<string, TranslatorInstance>();

function getCacheKey(sourceLanguage: string, targetLanguage: string): string {
  return `${sourceLanguage}-${targetLanguage}`;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Chrome Translator API 지원 여부 확인
 */
export function isTranslatorSupported(): boolean {
  return typeof Translator !== 'undefined';
}

/**
 * 언어쌍 지원 여부 및 다운로드 상태 확인
 */
export async function checkLanguageAvailability(
  sourceLanguage: string,
  targetLanguage: string
): Promise<'available' | 'downloadable' | 'unavailable'> {
  if (!isTranslatorSupported()) {
    return 'unavailable';
  }

  try {
    const availability = await Translator!.availability({
      sourceLanguage,
      targetLanguage,
    });
    return availability;
  } catch {
    return 'unavailable';
  }
}

/**
 * Translator 인스턴스 생성 (캐싱)
 */
export async function getOrCreateTranslator(
  sourceLanguage: string,
  targetLanguage: string,
  onProgress?: (progress: TranslationProgress) => void
): Promise<TranslatorInstance> {
  const cacheKey = getCacheKey(sourceLanguage, targetLanguage);

  // 캐시된 인스턴스 반환
  const cached = translatorCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (!isTranslatorSupported()) {
    throw new TranslationNotSupportedError('브라우저가 번역 기능을 지원하지 않습니다.');
  }

  // 새 인스턴스 생성
  const translator = await Translator!.create({
    sourceLanguage,
    targetLanguage,
    monitor: (monitor) => {
      monitor.addEventListener('downloadprogress', (event) => {
        onProgress?.({
          isDownloading: true,
          progress: Math.round(event.loaded * 100),
        });
      });
    },
  });

  // 다운로드 완료
  onProgress?.({
    isDownloading: false,
    progress: 100,
  });

  // 캐시에 저장
  translatorCache.set(cacheKey, translator);

  return translator;
}

/**
 * 단일 텍스트 번역
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string,
  onProgress?: (progress: TranslationProgress) => void
): Promise<string> {
  if (!text.trim()) return text;

  const translator = await getOrCreateTranslator(
    sourceLanguage,
    targetLanguage,
    onProgress
  );

  return translator.translate(text);
}

/**
 * 여러 텍스트 순차 번역
 * Chrome Translator는 배치를 지원하지 않으므로 순차 처리
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string,
  onProgress?: (progress: TranslationProgress) => void
): Promise<string[]> {
  if (texts.length === 0) return [];

  const translator = await getOrCreateTranslator(
    sourceLanguage,
    targetLanguage,
    onProgress
  );

  const results: string[] = [];

  for (const text of texts) {
    if (!text.trim()) {
      results.push(text);
      continue;
    }
    const translated = await translator.translate(text);
    results.push(translated);
  }

  return results;
}

/**
 * 캐시된 Translator 인스턴스 정리
 */
export function clearTranslatorCache(): void {
  translatorCache.forEach((translator) => {
    try {
      translator.destroy();
    } catch {
      // ignore
    }
  });
  translatorCache.clear();
}

// ============================================================================
// Custom Errors
// ============================================================================

export class TranslationNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationNotSupportedError';
  }
}

export class TranslationLanguageNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationLanguageNotAvailableError';
  }
}

export class TranslationDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationDownloadError';
  }
}

export class TranslationAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationAPIError';
  }
}
