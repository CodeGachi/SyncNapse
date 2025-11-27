/**
 * Transcript Translation Hook
 * DeepL API를 사용한 실시간 번역
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useScriptTranslationStore } from "@/stores";
import type { TranslationErrorType } from "@/stores/script-translation-store";
import {
  translateBatch,
  getUsage,
  toDeepLLanguage,
  TranslationConfigError,
  TranslationAuthError,
  TranslationQuotaError,
} from "@/lib/api/services/translation.api";

export function useTranscriptTranslation() {
  const {
    scriptSegments,
    isTranslationEnabled,
    targetLanguage,
    originalLanguage,
    isTranslating,
    updateSegmentTranslation,
    setIsTranslating,
    setTranslationError,
    setUsageInfo,
  } = useScriptTranslationStore();

  // 번역된 세그먼트 추적 (언어쌍별)
  const translatedSegmentIdsRef = useRef<Set<string>>(new Set());

  /**
   * 에러 타입 매핑
   */
  const handleError = useCallback((error: unknown): TranslationErrorType => {
    if (error instanceof TranslationConfigError) {
      return 'config_error';
    } else if (error instanceof TranslationAuthError) {
      return 'auth_error';
    } else if (error instanceof TranslationQuotaError) {
      return 'quota_exceeded';
    } else if (error instanceof Error && error.message.includes('fetch')) {
      return 'network_error';
    }
    return 'api_error';
  }, []);

  /**
   * 사용량 조회 및 업데이트
   */
  const updateUsage = useCallback(async () => {
    try {
      const usage = await getUsage();
      setUsageInfo({
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
      });
    } catch (error) {
      console.warn('[Translation] Failed to fetch usage:', error);
    }
  }, [setUsageInfo]);

  /**
   * 모든 미번역 세그먼트 번역 (배치)
   */
  const translateAllSegments = useCallback(async () => {
    if (!isTranslationEnabled) return;

    // 언어 쌍 키 생성
    const langPairKey = `${originalLanguage}-${targetLanguage}`;

    // 미번역 세그먼트 필터링
    const untranslatedSegments = scriptSegments.filter(
      (segment) =>
        !segment.translatedText &&
        segment.originalText &&
        !segment.isPartial &&
        !translatedSegmentIdsRef.current.has(`${segment.id}-${langPairKey}`)
    );

    if (untranslatedSegments.length === 0) {
      console.log('[Translation] No segments to translate');
      return;
    }

    setIsTranslating(true);
    setTranslationError(null);

    try {
      // DeepL 언어 코드로 변환
      const sourceLang = toDeepLLanguage(originalLanguage);
      const targetLang = toDeepLLanguage(targetLanguage);

      console.log('[Translation] Starting translation:', {
        segments: untranslatedSegments.length,
        from: sourceLang,
        to: targetLang,
      });

      // 배치 사이즈 (DeepL 권장: 50개 이하)
      const batchSize = 20;

      for (let i = 0; i < untranslatedSegments.length; i += batchSize) {
        const batch = untranslatedSegments.slice(i, i + batchSize);
        const texts = batch.map((seg) => seg.originalText);

        // 배치 번역 (단일 API 호출)
        const translatedTexts = await translateBatch(texts, targetLang, sourceLang);

        // 결과 업데이트
        batch.forEach((segment, idx) => {
          console.log('[Translation] Updating segment:', {
            segmentId: segment.id,
            original: segment.originalText,
            translated: translatedTexts[idx],
          });
          updateSegmentTranslation(segment.id, translatedTexts[idx]);
          translatedSegmentIdsRef.current.add(`${segment.id}-${langPairKey}`);
        });

        // 배치 간 딜레이 (rate limit 방지)
        if (i + batchSize < untranslatedSegments.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log('[Translation] Translation complete');

      // 사용량 업데이트
      await updateUsage();
    } catch (error) {
      console.error('[Translation] Translation failed:', error);
      const errorType = handleError(error);
      setTranslationError(errorType);

      // 실패한 세그먼트는 원본 유지 (이미 translatedText가 없으므로 별도 처리 불필요)
    } finally {
      setIsTranslating(false);
    }
  }, [
    isTranslationEnabled,
    scriptSegments,
    originalLanguage,
    targetLanguage,
    updateSegmentTranslation,
    setIsTranslating,
    setTranslationError,
    handleError,
    updateUsage,
  ]);

  // 언어 변경 시 에러 초기화 (캐시는 유지 - 다른 언어쌍은 별도 캐시)
  useEffect(() => {
    setTranslationError(null);
  }, [targetLanguage, originalLanguage, setTranslationError]);

  // 번역 활성화 또는 새 세그먼트 추가 시 자동 번역
  useEffect(() => {
    if (!isTranslationEnabled || isTranslating) return;

    const langPairKey = `${originalLanguage}-${targetLanguage}`;

    const needsTranslation = scriptSegments.some(
      (seg) =>
        !seg.translatedText &&
        seg.originalText &&
        !seg.isPartial &&
        !translatedSegmentIdsRef.current.has(`${seg.id}-${langPairKey}`)
    );

    if (needsTranslation) {
      console.log('[Translation] New segments detected, starting translation...');
      translateAllSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranslationEnabled, scriptSegments.length, targetLanguage]);

  // 컴포넌트 마운트 시 사용량 조회
  useEffect(() => {
    if (isTranslationEnabled) {
      updateUsage();
    }
  }, [isTranslationEnabled, updateUsage]);

  return {
    isTranslating,
    translateAllSegments,
    updateUsage,
  };
}
