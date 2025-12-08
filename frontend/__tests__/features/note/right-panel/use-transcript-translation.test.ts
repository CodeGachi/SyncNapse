import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/stores", () => ({
  useScriptTranslationStore: () => ({
    scriptSegments: [],
    isTranslationEnabled: false,
    targetLanguage: "ko",
    originalLanguage: "en",
    isTranslating: false,
    updateSegmentTranslation: vi.fn(),
    setIsTranslating: vi.fn(),
    setTranslationError: vi.fn(),
    setDownloadProgress: vi.fn(),
  }),
}));
vi.mock("@/lib/api/services/translation.api", () => ({
  isTranslatorSupported: () => true,
  checkLanguageAvailability: vi.fn(),
  translateBatch: vi.fn(),
  clearTranslatorCache: vi.fn(),
  TranslationNotSupportedError: class extends Error {},
  TranslationLanguageNotAvailableError: class extends Error {},
  TranslationDownloadError: class extends Error {},
}));

import { useTranscriptTranslation } from "@/features/note/right-panel/use-transcript-translation";

describe("useTranscriptTranslation", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useTranscriptTranslation());
    expect(result.current.isTranslating).toBe(false);
  });
});
