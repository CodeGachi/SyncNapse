/**
 * Note feature Module Barrel Export
 *
 * Structure:
 * - recording/: Record/Play Related (useRecordingList, useRecording, useRecordingControl, useAudioPlayer)
 * - text-notes/: Editor Related
 * - file/: File Management (useFilePanelUI)
 * - keyboard/: Keyboard Shortcuts (useNoteKeyboard)
 *
 * Note: FileItem, NoteBlock types moved to @/lib/types
 */
// Recording Module
export { useRecordingList, useRecording } from "./recording";
export type { RecordingData } from "./recording";

// File Module
export { useFilePanelUI } from "./file";

// Keyboard Module
export { useNoteKeyboard, NOTE_KEYBOARD_SHORTCUTS } from "./keyboard";

// Panels Module
export { useChatbotPanel, quizToMarkdown } from "./panels/use-chatbot-panel";
export type { Message } from "./panels/use-chatbot-panel";
