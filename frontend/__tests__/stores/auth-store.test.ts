/**
 * Tests for Auth Store (Zustand)
 */

import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "@/stores/auth-store";

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      isProfileDropdownOpen: false,
      showLoginPrompt: false,
    });
  });

  it("initializes with correct default state", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isProfileDropdownOpen).toBe(false);
    expect(result.current.showLoginPrompt).toBe(false);
  });

  it("sets profile dropdown open state", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setProfileDropdownOpen(true);
    });

    expect(result.current.isProfileDropdownOpen).toBe(true);

    act(() => {
      result.current.setProfileDropdownOpen(false);
    });

    expect(result.current.isProfileDropdownOpen).toBe(false);
  });

  it("toggles profile dropdown", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.isProfileDropdownOpen).toBe(false);

    act(() => {
      result.current.toggleProfileDropdown();
    });

    expect(result.current.isProfileDropdownOpen).toBe(true);

    act(() => {
      result.current.toggleProfileDropdown();
    });

    expect(result.current.isProfileDropdownOpen).toBe(false);
  });

  it("sets login prompt state", () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setShowLoginPrompt(true);
    });

    expect(result.current.showLoginPrompt).toBe(true);

    act(() => {
      result.current.setShowLoginPrompt(false);
    });

    expect(result.current.showLoginPrompt).toBe(false);
  });

  it("can select specific state slices", () => {
    const { result: dropdownResult } = renderHook(() =>
      useAuthStore((state) => state.isProfileDropdownOpen)
    );

    const { result: promptResult } = renderHook(() =>
      useAuthStore((state) => state.showLoginPrompt)
    );

    expect(dropdownResult.current).toBe(false);
    expect(promptResult.current).toBe(false);

    act(() => {
      useAuthStore.getState().setProfileDropdownOpen(true);
    });

    // Selectors automatically update when subscribed state changes
    expect(dropdownResult.current).toBe(true);
    expect(useAuthStore.getState().isProfileDropdownOpen).toBe(true);

    // The prompt selector should remain unchanged
    expect(promptResult.current).toBe(false);
  });
});
