/**
 * Text Notes Feature Exports
 * 텍스트 필기 기능 관련 hooks 및 유틸리티
 */

export { useNotePanel } from "./use-note-panel";
export type { NoteBlock } from "./use-note-panel";

// 텍스트 필기 유틸리티 함수들
export { getBlockStyle, getPlaceholder } from "./note-block-styles";
export { getVisibleBlocks } from "./use-toggle-visibility";
export { createKeyboardHandler } from "./use-note-keyboard";
export { useAutoSaveBadge } from "./use-auto-save-badge";