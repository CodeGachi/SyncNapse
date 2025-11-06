/**
 * Transcript Translation Hook
 * Uses HTML Translation API or fallback to Google Translate
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useScriptTranslationStore } from "@/stores";
import type { SupportedLanguage } from "@/lib/types";

export function useTranscriptTranslation() {
  const {
    scriptSegments,
    isTranslationEnabled,
    targetLanguage,
    originalLanguage,
    updateSegmentTranslation,
  } = useScriptTranslationStore();

  const [isTranslating, setIsTranslating] = useState(false);
  const [translationSupported, setTranslationSupported] = useState<boolean | null>(null);

  // Check if Translation API is supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check if the browser supports the Translation API
        const canTranslate = "translation" in self && "canTranslate" in (self as any).translation;
        setTranslationSupported(canTranslate);
      } catch (error) {
        console.error('[TranscriptTranslation] Error checking translation support:', error);
        setTranslationSupported(false);
      }
    };

    checkSupport();
  }, []);

  /**
   * Translate text using HTML Translation API (Chrome 130+)
   */
  const translateWithAPI = useCallback(async (text: string, from: string, to: string): Promise<string> => {
    try {
      // @ts-ignore - Translation API is experimental
      const canTranslate = await self.translation.canTranslate({ sourceLanguage: from, targetLanguage: to });
      
      if (canTranslate === 'no') {
        throw new Error('Translation not available for this language pair');
      }

      // @ts-ignore
      const translator = await self.translation.createTranslator({ sourceLanguage: from, targetLanguage: to });
      
      if (canTranslate === 'after-download') {
        // Wait for model download
        console.log('[TranscriptTranslation] Downloading translation model...');
      }

      const result = await translator.translate(text);
      return result;
    } catch (error) {
      console.error('[TranscriptTranslation] Translation API failed:', error);
      throw error;
    }
  }, []);

  /**
   * Fallback: Use Google Translate page translate feature
   */
  const translateWithFallback = useCallback(async (text: string, from: string, to: string): Promise<string> => {
    // Create a temporary element for translation
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    tempDiv.setAttribute('translate', 'yes');
    tempDiv.lang = from;
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    // Wait for potential automatic translation (if Google Translate is active)
    await new Promise(resolve => setTimeout(resolve, 100));

    const translated = tempDiv.textContent || text;
    document.body.removeChild(tempDiv);

    // If no translation occurred, return original
    if (translated === text) {
      console.warn('[TranscriptTranslation] Fallback translation not available');
      return text;
    }

    return translated;
  }, []);

  /**
   * Translate a single segment
   */
  const translateSegment = useCallback(
    async (segmentId: string, text: string) => {
      try {
        let translatedText: string;

        if (translationSupported) {
          translatedText = await translateWithAPI(text, originalLanguage, targetLanguage);
        } else {
          translatedText = await translateWithFallback(text, originalLanguage, targetLanguage);
        }

        updateSegmentTranslation(segmentId, translatedText);
      } catch (error) {
        console.error(`[TranscriptTranslation] Failed to translate segment ${segmentId}:`, error);
        // Keep original text on error
        updateSegmentTranslation(segmentId, text);
      }
    },
    [translationSupported, originalLanguage, targetLanguage, updateSegmentTranslation, translateWithAPI, translateWithFallback]
  );

  /**
   * Translate all untranslated segments
   */
  const translateAllSegments = useCallback(async () => {
    if (!isTranslationEnabled) return;

    setIsTranslating(true);

    try {
      // Translate segments in batches to avoid overwhelming the API
      const batchSize = 5;
      const untranslatedSegments = scriptSegments.filter(
        (segment) => !segment.translatedText || segment.translatedText === segment.originalText
      );

      for (let i = 0; i < untranslatedSegments.length; i += batchSize) {
        const batch = untranslatedSegments.slice(i, i + batchSize);
        await Promise.all(
          batch.map((segment) =>
            translateSegment(segment.id, segment.originalText)
          )
        );
      }
    } finally {
      setIsTranslating(false);
    }
  }, [isTranslationEnabled, scriptSegments, translateSegment]);

  // Auto-translate when translation is enabled
  useEffect(() => {
    if (isTranslationEnabled && scriptSegments.length > 0) {
      translateAllSegments();
    }
  }, [isTranslationEnabled, scriptSegments.length, translateAllSegments]);

  return {
    isTranslating,
    translationSupported,
    translateSegment,
    translateAllSegments,
  };
}

