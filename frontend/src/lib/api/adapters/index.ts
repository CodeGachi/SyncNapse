/**
 * Adapters Module Barrel Export
 * Type adapters for IndexedDB and API transformations
 */

// Note Adapter
export {
  dbToNote,
  dbToNotes,
  noteToDb,
  apiToNote,
  apiToNotes,
  toApiNoteCreateRequest,
} from "./note.adapter";

// Folder Adapter
export {
  dbToFolder,
  dbToFolders,
  folderToDb,
  apiToFolder,
  apiToFolders,
  toApiFolderCreateRequest,
} from "./folder.adapter";
