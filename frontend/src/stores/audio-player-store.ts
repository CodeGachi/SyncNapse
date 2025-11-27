/**
 * Audio Player Store
 * 오디오 플레이어 상태를 전역으로 관리 (여러 컴포넌트에서 공유)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AudioTimelineEvent } from "@/lib/api/audio.api";
import type { PageContext } from "@/lib/types";

interface AudioPlayerState {
  // Timeline events (녹음-페이지 연동용)
  timelineEvents: AudioTimelineEvent[];
  currentPageContext: PageContext | null;

  // Actions
  setTimelineEvents: (events: AudioTimelineEvent[]) => void;
  setCurrentPageContext: (context: PageContext | null) => void;
  clearTimeline: () => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>()(
  devtools(
    (set) => ({
      timelineEvents: [],
      currentPageContext: null,

      setTimelineEvents: (events) => {
        console.log('[AudioPlayerStore] 📦 setTimelineEvents:', events.length, 'events');
        set({ timelineEvents: events });
      },
      setCurrentPageContext: (context) => set({ currentPageContext: context }),
      clearTimeline: () => {
        console.log('[AudioPlayerStore] 🗑️ clearTimeline');
        set({ timelineEvents: [], currentPageContext: null });
      },
    }),
    {
      name: "AudioPlayerStore",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);
