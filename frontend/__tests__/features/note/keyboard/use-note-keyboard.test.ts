/**
 * useNoteKeyboard 훅 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNoteKeyboard, NOTE_KEYBOARD_SHORTCUTS } from "@/features/note/keyboard/use-note-keyboard";

describe("useNoteKeyboard", () => {
  const defaultProps = {
    isPdf: true,
    numPages: 10,
    currentPage: 5,
    setCurrentPage: vi.fn(),
    setScale: vi.fn(),
    setIsSearchOpen: vi.fn(),
    closeSearch: vi.fn(),
    toggleNotePanel: vi.fn(),
    onSave: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("마운트/언마운트 시 이벤트 리스너 등록/해제", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useNoteKeyboard(defaultProps));
    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("props 변경 시 새 핸들러 등록", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const { rerender } = renderHook((props) => useNoteKeyboard(props), { initialProps: defaultProps });
    const initialCount = addSpy.mock.calls.length;

    rerender({ ...defaultProps, currentPage: 6 });
    expect(addSpy.mock.calls.length).toBeGreaterThan(initialCount);
  });

  it("NOTE_KEYBOARD_SHORTCUTS 상수 존재", () => {
    expect(NOTE_KEYBOARD_SHORTCUTS.pdf.length).toBeGreaterThan(0);
    expect(NOTE_KEYBOARD_SHORTCUTS.panels.length).toBeGreaterThan(0);
    expect(NOTE_KEYBOARD_SHORTCUTS.drawing.length).toBeGreaterThan(0);
    expect(NOTE_KEYBOARD_SHORTCUTS.playback.length).toBeGreaterThan(0);
    expect(NOTE_KEYBOARD_SHORTCUTS.general.length).toBeGreaterThan(0);
  });

  it("isPdf=false, numPages=0 에서도 에러 없이 렌더링", () => {
    expect(() => renderHook(() => useNoteKeyboard({ ...defaultProps, isPdf: false }))).not.toThrow();
    expect(() => renderHook(() => useNoteKeyboard({ ...defaultProps, numPages: 0 }))).not.toThrow();
  });
});
