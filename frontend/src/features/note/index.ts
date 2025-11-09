/**
 * Note feature Module Barrel Export *  * Structure:
 * - player/: Record/Play Related (useRecordList, useRecord) * - editor/: Editor Related (useNotePanel) * - file/: File Management (useFilePanel) */ 
// Player Module
export { useRecordingList, useRecording } from "./player";
export type { RecordingData } from "./player";

// Text Notes Module (텍스트 필기)
export { useNotePanel } from "./text-notes";
export type { NoteBlock } from "./text-notes";

// File Module
export { useFilePanel } from "./file";
export type { FileItem } from "./file";
