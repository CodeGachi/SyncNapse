/**
 * 노트 에디터 Core Store (리팩토링됨)
 * 패널 상태는 panels-store로, 번역 상태는 script-translation-store로 분리
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NoteBlock } from "@/features/note/editor/use-note-panel";
import type { FileItem } from "@/features/note/file/use-file-panel";
import type { Question, AutoSaveStatus } from "@/lib/types";

interface NoteEditorState {
  // Note Blocks
  blocks: NoteBlock[];

  // File State
  files: FileItem[];
  selectedFileId: string | null;

  // UI State
  activeTab: number;
  activeCategories: string[];
  isExpanded: boolean;

  // Player State
  isPlaying: boolean;
  currentTime: number;
  isRecordingExpanded: boolean;

  // Question State
  questions: Question[];
  isQuestionModalOpen: boolean;
  isQuestionListExpanded: boolean;

  // AutoSave State
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt: string | null;

  // Note Block Actions
  addBlock: (afterId: string, type?: NoteBlock["type"]) => string;
  updateBlock: (id: string, updates: Partial<NoteBlock>) => void;
  deleteBlock: (id: string) => void;
  setBlocks: (blocks: NoteBlock[]) => void;

  // File Actions
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void;
  selectFile: (id: string) => void;
  loadFiles: (files: FileItem[]) => void;
  renameFile: (id: string, newName: string) => void;
  copyFile: (id: string) => void;

  // UI Actions
  setActiveTab: (index: number) => void;
  toggleCategory: (category: string) => void;
  toggleExpand: () => void;

  // Player Actions
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  toggleRecordingExpanded: () => void;

  // Question Actions
  addQuestion: (content: string, author: string) => void;
  answerQuestion: (id: string, answer: string) => void;
  deleteQuestion: (id: string) => void;
  toggleQuestionModal: () => void;
  toggleQuestionListExpanded: () => void;

  // AutoSave Actions
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
  updateLastSavedAt: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  // Note Blocks
  blocks: [
    {
      id: "1",
      type: "text" as const,
      content: "",
    },
  ],

  // Files
  files: [],
  selectedFileId: null,

  // UI
  activeTab: 0,
  activeCategories: ["Notes"],
  isExpanded: false,

  // Player
  isPlaying: false,
  currentTime: 0,
  isRecordingExpanded: false,

  // Question
  questions: [],
  isQuestionModalOpen: false,
  isQuestionListExpanded: false,

  // AutoSave
  autoSaveStatus: "idle" as AutoSaveStatus,
  lastSavedAt: null,
};

export const useNoteEditorStore = create<NoteEditorState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Note Block Actions
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
          if (state.blocks.length === 1) return state;
          return { blocks: state.blocks.filter((block) => block.id !== id) };
        }),

      setBlocks: (blocks) => set({ blocks }),

      // File Actions
      addFile: (file) =>
        set((state) => {
          const newFiles = [...state.files, file];
          const selectedId =
            state.files.length === 0 ? file.id : state.selectedFileId;
          return { files: newFiles, selectedFileId: selectedId };
        }),

      removeFile: (id) =>
        set((state) => {
          const fileToRemove = state.files.find((f) => f.id === id);
          if (fileToRemove?.url) {
            URL.revokeObjectURL(fileToRemove.url);
          }

          const newFiles = state.files.filter((file) => file.id !== id);
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
            files.length > 0 && !state.selectedFileId
              ? files[0].id
              : state.selectedFileId,
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
            id:
              Date.now().toString() +
              Math.random().toString(36).substr(2, 9),
            name: `${fileToCopy.name.replace(/(\.[^.]+)$/, "")} - 복사본$1`,
            uploadedAt: new Date().toISOString(),
          };

          return { files: [...state.files, newFile] };
        }),

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
        set((state) => ({
          isRecordingExpanded: !state.isRecordingExpanded,
        })),

      // Question Actions
      addQuestion: (content, author) =>
        set((state) => {
          const newQuestion: Question = {
            id:
              Date.now().toString() +
              Math.random().toString(36).substr(2, 9),
            content,
            author,
            timestamp: new Date().toISOString(),
            status: "pending",
          };
          return { questions: [...state.questions, newQuestion] };
        }),

      answerQuestion: (id, answer) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id
              ? {
                  ...q,
                  answer,
                  status: "answered" as const,
                  answeredAt: new Date().toISOString(),
                }
              : q
          ),
        })),

      deleteQuestion: (id) =>
        set((state) => ({
          questions: state.questions.filter((q) => q.id !== id),
        })),

      toggleQuestionModal: () =>
        set((state) => ({
          isQuestionModalOpen: !state.isQuestionModalOpen,
        })),

      toggleQuestionListExpanded: () =>
        set((state) => ({
          isQuestionListExpanded: !state.isQuestionListExpanded,
        })),

      // AutoSave Actions
      setAutoSaveStatus: (status) => set({ autoSaveStatus: status }),

      updateLastSavedAt: () =>
        set({
          lastSavedAt: new Date().toISOString(),
          autoSaveStatus: "saved",
        }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: "NoteEditorStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "noteEditorStore",
    }
  )
);
