/**
 * useTranscriptTranslation 훅 테스트
 *
 * Note: Chrome Translator API에 크게 의존하므로
 * 기본 기능과 에러 처리만 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTranscriptTranslation } from "@/features/note/right-panel/use-transcript-translation";

// Mock store
const mockStoreState = {
  scriptSegments: [],
  isTranslationEnabled: false,
  targetLanguage: "ko",
  originalLanguage: "en",
  isTranslating: false,
  updateSegmentTranslation: vi.fn(),
  setIsTranslating: vi.fn(),
  setTranslationError: vi.fn(),
  setDownloadProgress: vi.fn(),
};

vi.mock("@/stores", () => ({
  useScriptTranslationStore: vi.fn(() => mockStoreState),
}));

// Mock translation API
const mockIsTranslatorSupported = vi.fn(() => true);
const mockCheckLanguageAvailability = vi.fn(() => Promise.resolve("available"));
const mockTranslateBatch = vi.fn(() => Promise.resolve(["번역된 텍스트"]));
const mockClearTranslatorCache = vi.fn();

vi.mock("@/lib/api/services/translation.api", () => ({
  isTranslatorSupported: () => mockIsTranslatorSupported(),
  checkLanguageAvailability: (...args: unknown[]) =>
    mockCheckLanguageAvailability(...args),
  translateBatch: (...args: unknown[]) => mockTranslateBatch(...args),
  clearTranslatorCache: () => mockClearTranslatorCache(),
  TranslationNotSupportedError: class extends Error {},
  TranslationLanguageNotAvailableError: class extends Error {},
  TranslationDownloadError: class extends Error {},
}));

vi.mock("@/lib/utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("useTranscriptTranslation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store state
    mockStoreState.scriptSegments = [];
    mockStoreState.isTranslationEnabled = false;
    mockStoreState.isTranslating = false;
    mockStoreState.targetLanguage = "ko";
    mockStoreState.originalLanguage = "en";
  });

  describe("초기화", () => {
    it("기본 반환값 확인", () => {
      const { result } = renderHook(() => useTranscriptTranslation());

      expect(result.current.isTranslating).toBe(false);
      expect(result.current.translateAllSegments).toBeDefined();
      expect(result.current.isSupported).toBe(true);
    });

    it("번역기 미지원 시 isSupported false", () => {
      mockIsTranslatorSupported.mockReturnValue(false);

      const { result } = renderHook(() => useTranscriptTranslation());

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe("translateAllSegments", () => {
    it("번역 비활성화 시 아무것도 안함", async () => {
      mockStoreState.isTranslationEnabled = false;

      const { result } = renderHook(() => useTranscriptTranslation());

      await act(async () => {
        await result.current.translateAllSegments();
      });

      expect(mockTranslateBatch).not.toHaveBeenCalled();
    });

    it("미번역 세그먼트가 없으면 번역 안함", async () => {
      mockStoreState.isTranslationEnabled = true;
      mockStoreState.scriptSegments = [
        {
          id: "seg-1",
          originalText: "Hello",
          translatedText: "안녕", // 이미 번역됨
          isPartial: false,
        },
      ];

      const { result } = renderHook(() => useTranscriptTranslation());

      await act(async () => {
        await result.current.translateAllSegments();
      });

      expect(mockTranslateBatch).not.toHaveBeenCalled();
    });

    it("브라우저 미지원 시 에러 설정", async () => {
      mockStoreState.isTranslationEnabled = true;
      mockStoreState.scriptSegments = [
        { id: "seg-1", originalText: "Hello", isPartial: false },
      ];
      mockIsTranslatorSupported.mockReturnValue(false);

      const { result } = renderHook(() => useTranscriptTranslation());

      await act(async () => {
        await result.current.translateAllSegments();
      });

      expect(mockStoreState.setTranslationError).toHaveBeenCalledWith(
        "not_supported"
      );
    });

    it("언어 미지원 시 에러 설정", async () => {
      mockStoreState.isTranslationEnabled = true;
      mockStoreState.scriptSegments = [
        { id: "seg-1", originalText: "Hello", isPartial: false },
      ];
      // isTranslatorSupported가 true여야 checkLanguageAvailability까지 도달
      mockIsTranslatorSupported.mockReturnValue(true);
      mockCheckLanguageAvailability.mockResolvedValue("unavailable");

      const { result } = renderHook(() => useTranscriptTranslation());

      await act(async () => {
        await result.current.translateAllSegments();
      });

      expect(mockStoreState.setTranslationError).toHaveBeenCalledWith(
        "language_unavailable"
      );
    });
  });

  describe("isTranslating 상태", () => {
    it("store에서 isTranslating 상태 반환", () => {
      mockStoreState.isTranslating = true;

      const { result } = renderHook(() => useTranscriptTranslation());

      expect(result.current.isTranslating).toBe(true);
    });
  });
});
