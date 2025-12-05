/**
 * useNoteKeyboard 훅 테스트
 *
 * Note: jsdom에서 closest()가 window 이벤트에서 동작하지 않아
 * 기본 구조와 리스너 등록만 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNoteKeyboard, NOTE_KEYBOARD_SHORTCUTS } from "@/features/note/keyboard/use-note-keyboard";

describe("useNoteKeyboard", () => {
  const mockSetCurrentPage = vi.fn();
  const mockSetScale = vi.fn();
  const mockSetIsSearchOpen = vi.fn();
  const mockCloseSearch = vi.fn();
  const mockToggleNotePanel = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    isPdf: true,
    numPages: 10,
    currentPage: 5,
    setCurrentPage: mockSetCurrentPage,
    setScale: mockSetScale,
    setIsSearchOpen: mockSetIsSearchOpen,
    closeSearch: mockCloseSearch,
    toggleNotePanel: mockToggleNotePanel,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("이벤트 리스너", () => {
    it("마운트시 keydown 이벤트 리스너 등록", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      renderHook(() => useNoteKeyboard(defaultProps));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
    });

    it("언마운트시 keydown 이벤트 리스너 제거", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useNoteKeyboard(defaultProps));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function)
      );
    });
  });

  describe("props 변경 시 리렌더링", () => {
    it("currentPage 변경 시 새 핸들러 등록", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      const { rerender } = renderHook(
        (props) => useNoteKeyboard(props),
        { initialProps: defaultProps }
      );

      const initialCallCount = addEventListenerSpy.mock.calls.length;

      rerender({ ...defaultProps, currentPage: 6 });

      // 새 핸들러가 등록됨
      expect(addEventListenerSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it("numPages 변경 시 새 핸들러 등록", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");

      const { rerender } = renderHook(
        (props) => useNoteKeyboard(props),
        { initialProps: defaultProps }
      );

      const initialCallCount = addEventListenerSpy.mock.calls.length;

      rerender({ ...defaultProps, numPages: 20 });

      expect(addEventListenerSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe("NOTE_KEYBOARD_SHORTCUTS 상수", () => {
    it("PDF 단축키 목록 존재", () => {
      expect(NOTE_KEYBOARD_SHORTCUTS.pdf).toBeDefined();
      expect(NOTE_KEYBOARD_SHORTCUTS.pdf.length).toBeGreaterThan(0);
    });

    it("패널 단축키 목록 존재", () => {
      expect(NOTE_KEYBOARD_SHORTCUTS.panels).toBeDefined();
      expect(NOTE_KEYBOARD_SHORTCUTS.panels.length).toBeGreaterThan(0);
    });

    it("필기 단축키 목록 존재", () => {
      expect(NOTE_KEYBOARD_SHORTCUTS.drawing).toBeDefined();
      expect(NOTE_KEYBOARD_SHORTCUTS.drawing.length).toBeGreaterThan(0);
    });

    it("재생 단축키 목록 존재", () => {
      expect(NOTE_KEYBOARD_SHORTCUTS.playback).toBeDefined();
      expect(NOTE_KEYBOARD_SHORTCUTS.playback.length).toBeGreaterThan(0);
    });

    it("일반 단축키 목록 존재", () => {
      expect(NOTE_KEYBOARD_SHORTCUTS.general).toBeDefined();
      expect(NOTE_KEYBOARD_SHORTCUTS.general.length).toBeGreaterThan(0);
    });
  });

  describe("기본 props", () => {
    it("isPdf가 false면 PDF 관련 기능 비활성화", () => {
      // 에러 없이 렌더링 되어야 함
      const { unmount } = renderHook(() =>
        useNoteKeyboard({
          ...defaultProps,
          isPdf: false,
        })
      );

      unmount();
    });

    it("numPages가 0이면 페이지 네비게이션 비활성화", () => {
      // 에러 없이 렌더링 되어야 함
      const { unmount } = renderHook(() =>
        useNoteKeyboard({
          ...defaultProps,
          numPages: 0,
        })
      );

      unmount();
    });
  });
});
