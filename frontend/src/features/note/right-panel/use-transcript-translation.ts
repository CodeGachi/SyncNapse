/**
 * Transcript Translation Hook
 * Uses HTML Translation API or fallback to Google Translate
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
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
  
  // Track which segments have been translated to avoid re-translation
  const translatedSegmentIdsRef = useRef<Set<string>>(new Set());

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
      // Skip if already translated
      if (translatedSegmentIdsRef.current.has(segmentId)) {
        console.log('[TranscriptTranslation] Segment already translated:', segmentId);
        return;
      }

      try {
        let translatedText: string;

        if (translationSupported) {
          translatedText = await translateWithAPI(text, originalLanguage, targetLanguage);
        } else {
          translatedText = await translateWithFallback(text, originalLanguage, targetLanguage);
        }

        updateSegmentTranslation(segmentId, translatedText);
        translatedSegmentIdsRef.current.add(segmentId);
      } catch (error) {
        console.error(`[TranscriptTranslation] Failed to translate segment ${segmentId}:`, error);
        // Keep original text on error
        updateSegmentTranslation(segmentId, text);
        translatedSegmentIdsRef.current.add(segmentId);
      }
    },
    [translationSupported, originalLanguage, targetLanguage, updateSegmentTranslation, translateWithAPI, translateWithFallback]
  );

  /**
   * Translate all untranslated segments
   */
  const translateAllSegments = useCallback(async () => {
    if (!isTranslationEnabled) return;

    // Filter segments that need translation (skip partial and already translated)
    const untranslatedSegments = scriptSegments.filter(
      (segment) => 
        !segment.translatedText && 
        segment.originalText && 
        !(segment as any).isPartial &&
        !translatedSegmentIdsRef.current.has(segment.id)
    );

    if (untranslatedSegments.length === 0) {
      console.log('[TranscriptTranslation] No segments to translate');
      return;
    }

    setIsTranslating(true);

    try {
      console.log('[TranscriptTranslation] Translating', untranslatedSegments.length, 'segments');
      
      // Translate segments in batches to avoid overwhelming the API
      const batchSize = 3;

      for (let i = 0; i < untranslatedSegments.length; i += batchSize) {
        const batch = untranslatedSegments.slice(i, i + batchSize);
        await Promise.all(
          batch.map((segment) =>
            translateSegment(segment.id, segment.originalText)
          )
        );
        
        // Small delay between batches
        if (i + batchSize < untranslatedSegments.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log('[TranscriptTranslation] Translation complete');
    } catch (error) {
      console.error('[TranscriptTranslation] Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [isTranslationEnabled, scriptSegments, translateSegment]);

  // Clear translation cache when language changes
  useEffect(() => {
    translatedSegmentIdsRef.current.clear();
    console.log('[TranscriptTranslation] Translation cache cleared');
  }, [targetLanguage, originalLanguage]);

  // Auto-translate when translation is enabled or target language changes
  useEffect(() => {
    if (!isTranslationEnabled) return;
    if (isTranslating) return; // Prevent overlapping translations
    
    // Only translate segments that don't have translations yet
    const needsTranslation = scriptSegments.some(
      seg => !seg.translatedText && 
             seg.originalText && 
             !(seg as any).isPartial &&
             !translatedSegmentIdsRef.current.has(seg.id)
    );
    
    if (needsTranslation) {
      console.log('[TranscriptTranslation] New segments detected, starting translation...');
      translateAllSegments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTranslationEnabled, scriptSegments.length]);

  return {
    isTranslating,
    translationSupported,
    translateSegment,
    translateAllSegments,
  };
}

