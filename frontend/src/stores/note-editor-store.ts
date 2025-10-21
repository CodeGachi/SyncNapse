/**
 * 노트 에디터 Zustand Store
 * 노트 편집 페이지의 모든 패널 상태 통합 관리
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NoteBlock } from "@/features/note/editor/use-note-panel";
import type { FileItem } from "@/features/note/file/use-file-panel";

interface NoteEditorState {
  // Note Panel State
  isNotePanelOpen: boolean;
  blocks: NoteBlock[];

  // File Panel State
  isFilePanelOpen: boolean;
  files: FileItem[];
  selectedFileId: string | null;

  // Script Panel State
  isScriptOpen: boolean;

  // UI State
  activeTab: number;
  activeCategories: string[];
  isExpanded: boolean;

  // Player State
  isPlaying: boolean;
  currentTime: number;
  isRecordingExpanded: boolean;

  // Note Panel Actions
  toggleNotePanel: () => void;
  addBlock: (afterId: string, type?: NoteBlock["type"]) => string;
  updateBlock: (id: string, updates: Partial<NoteBlock>) => void;
  deleteBlock: (id: string) => void;
  setBlocks: (blocks: NoteBlock[]) => void;

  // File Panel Actions
  toggleFilePanel: () => void;
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  selectFile: (id: string) => void;
  loadFiles: (files: FileItem[]) => void;
  renameFile: (id: string, newName: string) => void;
  copyFile: (id: string) => void;

  // Script Panel Actions
  toggleScript: () => void;

  // UI Actions
  setActiveTab: (index: number) => void;
  toggleCategory: (category: string) => void;
  toggleExpand: () => void;

  // Player Actions
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  toggleRecordingExpanded: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  // Note Panel
  isNotePanelOpen: false,
  blocks: [
    {
      id: "1",
      type: "text" as const,
      content: "",
    },
  ],

  // File Panel
  isFilePanelOpen: false,
  files: [],
  selectedFileId: null,

  // Script Panel
  isScriptOpen: false,

  // UI
  activeTab: 0,
  activeCategories: ["Notes"],
  isExpanded: false,

  // Player
  isPlaying: false,
  currentTime: 0,
  isRecordingExpanded: false,
};

export const useNoteEditorStore = create<NoteEditorState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Note Panel Actions
      toggleNotePanel: () =>
        set((state) => ({ isNotePanelOpen: !state.isNotePanelOpen })),

      addBlock: (afterId, type = "text") => {
        const state = get();
        const index = state.blocks.findIndex((b) => b.id === afterId);
        const newBlock: NoteBlock = {
          id: Date.now().toString(),
          type,
          content: "",
        };
        const newBlocks = [...state.blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        set({ blocks: newBlocks });
        return newBlock.id;
      },

      updateBlock: (id, updates) =>
        set((state) => ({
          blocks: state.blocks.map((block) =>
            block.id === id ? { ...block, ...updates } : block
          ),
        })),

      deleteBlock: (id) =>
        set((state) => {
          if (state.blocks.length === 1) return state; // 최소 1개 유지
          return { blocks: state.blocks.filter((block) => block.id !== id) };
        }),

      setBlocks: (blocks) => set({ blocks }),

      // File Panel Actions
      toggleFilePanel: () =>
        set((state) => ({ isFilePanelOpen: !state.isFilePanelOpen })),

      addFile: (file) =>
        set((state) => {
          const newFiles = [...state.files, file];
          // 첫 번째 파일이면 자동 선택
          const selectedId =
            state.files.length === 0 ? file.id : state.selectedFileId;
          return { files: newFiles, selectedFileId: selectedId };
        }),

      removeFile: (id) =>
        set((state) => {
          const fileToRemove = state.files.find((f) => f.id === id);
          if (fileToRemove?.url) {
            // Blob URL 메모리 해제
            URL.revokeObjectURL(fileToRemove.url);
          }

          const newFiles = state.files.filter((file) => file.id !== id);

          // 선택된 파일이 삭제되면 다음 파일 선택
          let newSelectedId = state.selectedFileId;
          if (state.selectedFileId === id) {
            newSelectedId = newFiles.length > 0 ? newFiles[0].id : null;
          }

          return { files: newFiles, selectedFileId: newSelectedId };
        }),

      selectFile: (id) => set({ selectedFileId: id }),

      loadFiles: (files) =>
        set((state) => ({
          files,
          selectedFileId:
            files.length > 0 && !state.selectedFileId ? files[0].id : state.selectedFileId,
        })),

      renameFile: (id, newName) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, name: newName } : file
          ),
        })),

      copyFile: (id) =>
        set((state) => {
          const fileToCopy = state.files.find((f) => f.id === id);
          if (!fileToCopy) return state;

          const newFile: FileItem = {
            ...fileToCopy,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: `${fileToCopy.name.replace(/(\.[^.]+)$/, "")} - 복사본$1`,
            uploadedAt: new Date().toISOString(),
          };

          return { files: [...state.files, newFile] };
        }),

      // Script Panel Actions
      toggleScript: () => set((state) => ({ isScriptOpen: !state.isScriptOpen })),

      // UI Actions
      setActiveTab: (index) => set({ activeTab: index }),

      toggleCategory: (category) =>
        set((state) => ({
          activeCategories: state.activeCategories.includes(category)
            ? state.activeCategories.filter((c) => c !== category)
            : [...state.activeCategories, category],
        })),

      toggleExpand: () => set((state) => ({ isExpanded: !state.isExpanded })),

      // Player Actions
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      setCurrentTime: (time) => set({ currentTime: time }),

      toggleRecordingExpanded: () =>
        set((state) => ({ isRecordingExpanded: !state.isRecordingExpanded })),

      // Reset
      reset: () => set(initialState),
    }),
    { name: "NoteEditorStore" }
  )
);
