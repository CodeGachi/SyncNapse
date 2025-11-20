/**
 * Note feature Module Barrel Export
 *
 * Structure:
 * - recording/: Record/Play Related (useRecordingList, useRecording, useRecordingControl, useAudioPlayer)
 * - text-notes/: Editor Related (useNotePanel)
 * - file/: File Management (useFilePanel)
 */
// Recording Module
export { useRecordingList, useRecording } from "./recording";
export type { RecordingData } from "./recording";

// Text Notes Module (텍스트 필기)
export { useNotePanel } from "./text-notes";
export type { NoteBlock } from "./text-notes";

// File Module
export { useFilePanel, useFilePanelUI } from "./file";
export type { FileItem } from "./file";
