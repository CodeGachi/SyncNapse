/**
 * Note 기능 모듈 Barrel Export
 *
 * 구조:
 * - player/   : 녹음/재생 관련 (useNotePlayer, useRecordingList)
 * - editor/   : 에디터 관련 (useNotePanel, useScriptPanel)
 * - file/     : 파일 관리 (useFilePanel)
 * - ui/       : UI 상태 관리 (useNoteTabs, useNoteSettings)
 */

// Player 모듈
export { useNotePlayer, useRecordingList } from "./player";

// Editor 모듈
export { useNotePanel, useScriptPanel } from "./editor";
export type { NoteBlock } from "./editor";

// File 모듈
export { useFilePanel } from "./file";
export type { FileItem } from "./file";

// UI 모듈
export { useNoteSettings, useNoteTabs } from "./ui";
