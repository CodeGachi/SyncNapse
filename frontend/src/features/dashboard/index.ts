/**
 * Dashboard 기능 모듈 Barrel Export
 * 기능 중심 구조: core, folders, notes, sidebar
 */

// Core
export { useDashboard } from "./core/use-dashboard";
export { useFolders } from "./core/use-folders";
export type { FolderTreeNode } from "./core/use-folders";

// Folders (폴더 관련 모든 기능)
export { useFolderTree } from "./folders/use-folder-tree";
export { useFolderSelectorModal } from "./folders/use-folder-selector-modal";
export { useCreateFolderModal } from "./folders/use-create-folder-modal";
export { useRenameFolderModal } from "./folders/use-rename-folder-modal";
export { useDeleteFolderModal } from "./folders/use-delete-folder-modal";
export { useFolderOptionsMenu } from "./folders/use-folder-options-menu";
export { useFolderDragDrop } from "./folders/use-folder-drag-drop";

// Notes (노트 관련 모든 기능)
export { useCreateNoteModal } from "./notes/use-create-note-modal";
export { useFileList } from "./notes/use-file-list";

// Sidebar
export { useDashboardSidebar } from "./sidebar/use-dashboard-sidebar";
