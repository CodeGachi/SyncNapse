/**
 * Note feature Module Barrel Export
 *
 * Structure:
 * - recording/: Record/Play Related (useRecordingList, useRecording, useRecordingControl, useAudioPlayer)
 * - text-notes/: Editor Related
 * - file/: File Management (useFilePanelUI)
 *
 * Note: FileItem, NoteBlock types moved to @/lib/types
 */
// Recording Module
export { useRecordingList, useRecording } from "./recording";
export type { RecordingData } from "./recording";

// File Module
export { useFilePanelUI } from "./file";
