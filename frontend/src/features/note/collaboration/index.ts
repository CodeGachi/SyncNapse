/**
 * Collaboration features barrel export
 *
 * 실시간 협업 기능 관련 훅 모음
 */

// 노트 데이터 동기화
export { useSyncNoteToLiveblocks } from "./use-sync-note-to-liveblocks";
export { useSharedNoteData } from "./use-shared-note-data";

// 손들기 기능
export {
  useHandRaise,
  useHandRaiseEventListener,
  type HandRaise,
} from "./use-hand-raise";

// 투표 기능
export {
  usePoll,
  usePollEventListener,
  type Poll,
  type PollOption,
} from "./use-poll";

// Q&A 기능
export {
  useQA,
  useQAEventListener,
  type QAQuestion,
  type QAAnswer,
} from "./use-qa";

// 캔버스 동기화
export {
  useCollaborativeCanvasSync,
  type UseCollaborativeCanvasSyncProps,
  type UseCollaborativeCanvasSyncReturn,
} from "./use-collaborative-canvas-sync";
