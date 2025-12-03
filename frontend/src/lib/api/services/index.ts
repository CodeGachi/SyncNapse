/**
 * Services Module Barrel Export
 * API service functions
 */

export * from "./auth.api";
export * from "./notes.api";
export * from "./folders.api";
export * from "./files.api";
export * from "./recordings.api";
export * from "./trash.api";
export * from "./search.api";
export * from "./ai.api";
export * from "./translation.api";
export * from "./questions.api";
export * from "./note-content.api";
// audio.api has deleteRecording which conflicts with recordings.api
// Export with alias to avoid conflict
export {
  type AudioRecording,
  type AudioTimelineEvent,
  type CreateAudioRecordingDto,
  type CreateTimelineEventDto,
  createRecording as createAudioRecording,
  getRecording as getAudioRecording,
  deleteRecording as deleteAudioRecording,
  addTimelineEvent,
  getTimelineEvents,
  getPageContextAtTime,
} from "./audio.api";
export * from "./transcription.api";
export * from "./file-upload.api";
// page-content.api has saveNoteContent which conflicts with notes.api
// Export with alias to avoid conflict
export {
  savePageContent,
  getPageContent,
  deletePageContent,
  saveNoteContent as saveNoteContentByPage,
  getNoteContent as getNoteContentByPage,
  deleteNoteContent as deleteNoteContentByPage,
  type NoteBlock,
  type PageBlocks,
  type NoteContent,
  type SaveNoteContentDto,
  type PageContent,
  type SavePageContentDto,
} from "./page-content.api";
