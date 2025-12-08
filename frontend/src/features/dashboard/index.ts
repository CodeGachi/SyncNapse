/**
 * Dashboard 기능 모듈 Barrel Export
 * 기능 중심 구조: core, folders, notes, sidebar
 */

// Core
export { useDashboard } from "./core/use-dashboard";
export { useFolders } from "./core/use-folders";
export type { FolderTreeNode } from "./core/use-folders";

// Folders (폴더 관련 모든 기능)
export { useFolderDragDrop } from "./folders/use-folder-drag-drop";

// Notes (노트 관련 모든 기능)
export { useCreateNoteModal } from "./notes/use-create-note-modal";

// Sidebar
export { useDashboardSidebar } from "./sidebar/use-dashboard-sidebar";

// Search
export { useSearchDropdown, formatTime, highlightText } from "./search/use-search-dropdown";

// Views
export { useMainContent } from "./views/use-main-content";
export { useFavorites } from "./views/use-favorites";
export { useTrash } from "./views/use-trash";
export { useProfile, type ModalType } from "./views/use-profile";
