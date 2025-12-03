/**
 * 트랜스크립트 번역 훅
 * Chrome Translator API를 사용한 실시간 번역
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("TranscriptTranslation");
import { useScriptTranslationStore } from "@/stores";
import type { TranslationErrorType } from "@/stores/script-translation-store";
import {
  isTranslatorSupported,
  checkLanguageAvailability,
  translateBatch,
  clearTranslatorCache,
  TranslationNotSupportedError,
  TranslationLanguageNotAvailableError,
  TranslationDownloadError,
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
    setDownloadProgress,
  } = useScriptTranslationStore();

  // 번역된 세그먼트 추적 (언어쌍별)
  const translatedSegmentIdsRef = useRef<Set<string>>(new Set());

  /**
   * 에러 타입 매핑
   */
  const handleError = useCallback((error: unknown): TranslationErrorType => {
    if (error instanceof TranslationNotSupportedError) {
      return 'not_supported';
    } else if (error instanceof TranslationLanguageNotAvailableError) {
      return 'language_unavailable';
    } else if (error instanceof TranslationDownloadError) {
      return 'download_failed';
    } else if (error instanceof Error && error.message.includes('fetch')) {
      return 'network_error';
    }
    return 'api_error';
  }, []);

  /**
   * 브라우저 지원 여부 체크
   */
  const checkSupport = useCallback(async (): Promise<boolean> => {
    if (!isTranslatorSupported()) {
      setTranslationError('not_supported');
      return false;
    }

    const availability = await checkLanguageAvailability(originalLanguage, targetLanguage);
    if (availability === 'unavailable') {
      setTranslationError('language_unavailable');
      return false;
    }

    return true;
  }, [originalLanguage, targetLanguage, setTranslationError]);

  /**
   * 모든 미번역 세그먼트 번역
   */
  const translateAllSegments = useCallback(async () => {
    if (!isTranslationEnabled) return;

    // 브라우저 지원 체크
    const supported = await checkSupport();
    if (!supported) return;

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
      log.debug('번역할 세그먼트 없음');
      return;
    }

    setIsTranslating(true);
    setTranslationError(null);

    try {
      log.debug('번역 시작:', {
        segments: untranslatedSegments.length,
        from: originalLanguage,
        to: targetLanguage,
      });

      // 배치 사이즈 (Chrome Translator는 순차 처리하므로 작게)
      const batchSize = 10;

      for (let i = 0; i < untranslatedSegments.length; i += batchSize) {
        const batch = untranslatedSegments.slice(i, i + batchSize);
        const texts = batch.map((seg) => seg.originalText);

        // 번역 (다운로드 진행률 모니터링 포함)
        const translatedTexts = await translateBatch(
          texts,
          targetLanguage,
          originalLanguage,
          (progress) => {
            setDownloadProgress(progress);
          }
        );

        // 다운로드 완료 후 진행률 숨김
        setDownloadProgress(null);

        // 결과 업데이트
        batch.forEach((segment, idx) => {
          log.debug('세그먼트 업데이트:', {
            segmentId: segment.id,
            original: segment.originalText,
            translated: translatedTexts[idx],
          });
          updateSegmentTranslation(segment.id, translatedTexts[idx]);
          translatedSegmentIdsRef.current.add(`${segment.id}-${langPairKey}`);
        });
      }

      log.debug('번역 완료');
    } catch (error) {
      log.error('번역 실패:', error);
      const errorType = handleError(error);
      setTranslationError(errorType);
      setDownloadProgress(null);
    } finally {
      setIsTranslating(false);
    }
  }, [
    isTranslationEnabled,
    scriptSegments,
    originalLanguage,
    targetLanguage,
    checkSupport,
    updateSegmentTranslation,
    setIsTranslating,
    setTranslationError,
    setDownloadProgress,
    handleError,
  ]);

  // 이전 언어 추적
  const prevTargetLanguageRef = useRef(targetLanguage);

  // 언어 변경 시 기존 번역 초기화
  useEffect(() => {
    if (prevTargetLanguageRef.current !== targetLanguage) {
      log.debug('언어 변경 감지:', prevTargetLanguageRef.current, '→', targetLanguage);
      prevTargetLanguageRef.current = targetLanguage;

      // 번역 세그먼트 ID 캐시 초기화
      translatedSegmentIdsRef.current.clear();

      // Translator 인스턴스 캐시 초기화 (새 언어쌍용 인스턴스 생성 위해)
      clearTranslatorCache();

      // 기존 번역 텍스트 초기화 (undefined로 설정해야 falsy 체크 통과)
      scriptSegments.forEach((segment) => {
        if (segment.translatedText) {
          updateSegmentTranslation(segment.id, undefined as unknown as string);
        }
      });

      setTranslationError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLanguage]);

  // 언어 변경 후 재번역 트리거
  useEffect(() => {
    if (!isTranslationEnabled || isTranslating) return;

    // 번역이 필요한 세그먼트가 있는지 확인
    const hasUntranslated = scriptSegments.some(
      (seg) => !seg.translatedText && seg.originalText && !seg.isPartial
    );

    if (hasUntranslated) {
      log.debug('미번역 세그먼트 감지, 번역 시작...');
      translateAllSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranslationEnabled, scriptSegments, targetLanguage]);

  // 원본 언어 변경 시 에러 초기화
  useEffect(() => {
    setTranslationError(null);
  }, [originalLanguage, setTranslationError]);

  return {
    isTranslating,
    translateAllSegments,
    isSupported: isTranslatorSupported(),
  };
}
