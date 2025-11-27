/**
 * Translation API Service
 * DeepL API를 사용한 번역 서비스
 *
 * 제한사항:
 * - 무료: 50만자/월
 * - 유료: $25/백만자
 *
 * API 문서: https://developers.deepl.com/docs
 */

// ============================================================================
// Types
// ============================================================================

/** DeepL 지원 언어 코드 */
export type DeepLLanguage =
  | 'KO'    // 한국어
  | 'EN'    // 영어 (unspecified variant)
  | 'EN-US' // 영어 (미국)
  | 'EN-GB' // 영어 (영국)
  | 'JA'    // 일본어
  | 'ZH'    // 중국어 (간체)
  | 'ES'    // 스페인어
  | 'FR'    // 프랑스어
  | 'DE'    // 독일어
  | 'RU'    // 러시아어
  | 'PT'    // 포르투갈어
  | 'PT-BR' // 포르투갈어 (브라질)
  | 'IT'    // 이탈리아어
  | 'NL'    // 네덜란드어
  | 'PL';   // 폴란드어

interface DeepLTranslation {
  detected_source_language: string;
  text: string;
}

interface DeepLResponse {
  translations: DeepLTranslation[];
}

interface DeepLUsageResponse {
  character_count: number;
  character_limit: number;
}

interface DeepLErrorResponse {
  message: string;
}

export interface TranslateOptions {
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less';
  preserveFormatting?: boolean;
}

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
}

// ============================================================================
// Constants
// ============================================================================

// Next.js API Route를 통한 프록시 (CORS 우회)
const TRANSLATE_API_URL = '/api/translate';

// ============================================================================
// API Functions
// ============================================================================

/**
 * DeepL API로 텍스트 번역 (Next.js API Route 프록시 사용)
 */
export async function translateText(
  text: string,
  targetLang: DeepLLanguage,
  sourceLang?: DeepLLanguage,
  _options?: TranslateOptions
): Promise<string> {
  if (!text.trim()) return text;

  const response = await fetch(TRANSLATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: text,
      targetLang,
      sourceLang,
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: DeepLResponse = await response.json();
  return data.translations[0].text;
}

/**
 * 여러 텍스트 배치 번역 (Next.js API Route 프록시 사용)
 */
export async function translateBatch(
  texts: string[],
  targetLang: DeepLLanguage,
  sourceLang?: DeepLLanguage,
  _options?: TranslateOptions
): Promise<string[]> {
  if (texts.length === 0) return [];

  // 빈 텍스트 필터링 및 인덱스 추적
  const validTexts: { index: number; text: string }[] = [];
  texts.forEach((text, index) => {
    if (text.trim()) {
      validTexts.push({ index, text });
    }
  });

  if (validTexts.length === 0) return texts;

  const response = await fetch(TRANSLATE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: validTexts.map(v => v.text),
      targetLang,
      sourceLang,
    }),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: DeepLResponse = await response.json();

  // 결과를 원래 인덱스에 매핑
  const results = [...texts]; // 원본 복사
  validTexts.forEach(({ index }, i) => {
    results[index] = data.translations[i].text;
  });

  return results;
}

/**
 * 사용량 조회 (Next.js API Route 프록시 사용)
 */
export async function getUsage(): Promise<UsageInfo> {
  const response = await fetch(TRANSLATE_API_URL, {
    method: 'GET',
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: DeepLUsageResponse = await response.json();

  return {
    used: data.character_count,
    limit: data.character_limit,
    remaining: data.character_limit - data.character_count,
    percentage: Math.round((data.character_count / data.character_limit) * 100),
  };
}

// ============================================================================
// Error Handling
// ============================================================================

async function handleApiError(response: Response): Promise<never> {
  const status = response.status;

  switch (status) {
    case 400:
      throw new TranslationAPIError('잘못된 요청입니다.');
    case 403:
      throw new TranslationAuthError('API 키가 유효하지 않습니다.');
    case 413:
      throw new TranslationAPIError('요청 크기가 너무 큽니다.');
    case 429:
      throw new TranslationQuotaError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    case 456:
      throw new TranslationQuotaError('월간 번역 한도를 초과했습니다.');
    case 503:
      throw new TranslationAPIError('서비스가 일시적으로 사용 불가합니다.');
    default:
      const errorData = await response.json().catch(() => null);
      throw new TranslationAPIError(
        (errorData as DeepLErrorResponse)?.message || `번역 실패 (${status})`
      );
  }
}

// ============================================================================
// Custom Errors
// ============================================================================

export class TranslationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationConfigError';
  }
}

export class TranslationAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationAuthError';
  }
}

export class TranslationQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationQuotaError';
  }
}

export class TranslationAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranslationAPIError';
  }
}

// ============================================================================
// Language Mapping (기존 코드 → DeepL 형식)
// ============================================================================

const LANGUAGE_MAP: Record<string, DeepLLanguage> = {
  'ko': 'KO',
  'en': 'EN',
  'ja': 'JA',
  'zh': 'ZH',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
  'ru': 'RU',
  'pt': 'PT',
  'it': 'IT',
  'nl': 'NL',
  'pl': 'PL',
};

export function toDeepLLanguage(code: string): DeepLLanguage {
  return LANGUAGE_MAP[code.toLowerCase()] || 'EN';
}

export function fromDeepLLanguage(deepLCode: string): string {
  const entry = Object.entries(LANGUAGE_MAP).find(([, value]) => value === deepLCode);
  return entry ? entry[0] : 'en';
}
