/**
 * 녹음 상태 전역 Store
 * 녹음 중 페이지 이동 등을 제어하기 위한 전역 상태
 */
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface RecordingState {
  // 녹음 상태
  isRecording: boolean;
  isPaused: boolean;

  // 녹음 중지 콜백 (저장 모달 열기용)
  stopRecordingCallback: (() => void) | null;

  // Actions
  setIsRecording: (isRecording: boolean) => void;
  setIsPaused: (isPaused: boolean) => void;
  setStopRecordingCallback: (callback: (() => void) | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  isRecording: false,
  isPaused: false,
  stopRecordingCallback: null as (() => void) | null,
};

export const useRecordingStore = create<RecordingState>()(
  devtools(
    (set) => ({
      ...initialState,

      setIsRecording: (isRecording) => set({ isRecording }),
      setIsPaused: (isPaused) => set({ isPaused }),
      setStopRecordingCallback: (callback) => set({ stopRecordingCallback: callback }),

      reset: () => set(initialState),
    }),
    {
      name: "RecordingStore",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);
