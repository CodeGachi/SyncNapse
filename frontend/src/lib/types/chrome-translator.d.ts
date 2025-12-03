/**
 * Chrome Translator API TypeScript 타입 정의
 * @see https://developer.chrome.com/docs/ai/translator-api
 */

declare global {
  interface TranslatorMonitor extends EventTarget {
    addEventListener(
      type: 'downloadprogress',
      listener: (event: TranslatorDownloadProgressEvent) => void
    ): void;
  }

  interface TranslatorDownloadProgressEvent extends Event {
    loaded: number; // 0 to 1
  }

  interface TranslatorCreateOptions {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: TranslatorMonitor) => void;
  }

  interface TranslatorInstance {
    translate(text: string): Promise<string>;
    translateStreaming(text: string): ReadableStream<string>;
    readonly sourceLanguage: string;
    readonly targetLanguage: string;
    destroy(): void;
  }

  type TranslatorAvailability = 'available' | 'downloadable' | 'unavailable';

  interface TranslatorConstructor {
    create(options: TranslatorCreateOptions): Promise<TranslatorInstance>;
    availability(options: {
      sourceLanguage: string;
      targetLanguage: string;
    }): Promise<TranslatorAvailability>;
  }

  // Global Translator object
  const Translator: TranslatorConstructor | undefined;
}

export {};
