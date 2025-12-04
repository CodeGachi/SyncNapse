/**
 * Audio Player Store
 * 오디오 플레이어 상태를 전역으로 관리 (여러 컴포넌트에서 공유)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { AudioTimelineEvent } from "@/lib/api/services/audio.api";
import type { PageContext } from "@/lib/types";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("AudioPlayerStore");

interface AudioPlayerState {
  // Timeline events (녹음-페이지 연동용)
  timelineEvents: AudioTimelineEvent[];
  currentPageContext: PageContext | null;

  // Current session (편집 시 리비전 저장용)
  currentSessionId: string | null;

  // 검색에서 점프할 시간 (초) - URL 파라미터로 전달받은 시간
  pendingSeekTime: number | null;

  // Actions
  setTimelineEvents: (events: AudioTimelineEvent[]) => void;
  setCurrentPageContext: (context: PageContext | null) => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  clearTimeline: () => void;
  setPendingSeekTime: (time: number | null) => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>()(
  devtools(
    (set) => ({
      timelineEvents: [],
      currentPageContext: null,
      currentSessionId: null,
      pendingSeekTime: null,

      setTimelineEvents: (events) => {
        log.debug('setTimelineEvents:', events.length, 'events');
        set({ timelineEvents: events });
      },
      setCurrentPageContext: (context) => set({ currentPageContext: context }),
      setCurrentSessionId: (sessionId) => {
        log.debug('setCurrentSessionId:', sessionId);
        set({ currentSessionId: sessionId });
      },
      clearTimeline: () => {
        log.debug('clearTimeline');
        set({ timelineEvents: [], currentPageContext: null, currentSessionId: null, pendingSeekTime: null });
      },
      setPendingSeekTime: (time) => {
        log.debug('setPendingSeekTime:', time);
        set({ pendingSeekTime: time });
      },
    }),
    {
      name: "AudioPlayerStore",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);
