/**
 * 노트 생성 설정 Zustand Store
 * 노트 생성 모달의 상태 관리 (제목, 위치, 파일 등)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { UploadedFile } from "@/lib/types";

interface NoteSettingsState {
  // State
  title: string;
  selectedLocation: string;
  uploadedFiles: UploadedFile[];
  selectedFileIndex: number | null;
  isDragActive: boolean;
  validationErrors: string[];
  autoExtractZip: boolean;

  // Actions
  setTitle: (title: string) => void;
  setSelectedLocation: (location: string) => void;
  setUploadedFiles: (files: UploadedFile[]) => void;
  addUploadedFiles: (files: UploadedFile[]) => void;
  removeUploadedFile: (file: File) => void;
  updateUploadedFile: (file: File, updates: Partial<UploadedFile>) => void;
  setSelectedFileIndex: (index: number | null) => void;
  setIsDragActive: (active: boolean) => void;
  setValidationErrors: (errors: string[]) => void;
  setAutoExtractZip: (enabled: boolean) => void;
  reset: () => void;
}

const initialState = {
  title: "",
  selectedLocation: "root",
  uploadedFiles: [],
  selectedFileIndex: null,
  isDragActive: false,
  validationErrors: [],
  autoExtractZip: false,
};

export const useNoteSettingsStore = create<NoteSettingsState>()(
  devtools(
    (set) => ({
      ...initialState,

      setTitle: (title) => set({ title }),

      setSelectedLocation: (location) => set({ selectedLocation: location }),

      setUploadedFiles: (files) => set({ uploadedFiles: files }),

      addUploadedFiles: (files) =>
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, ...files],
        })),

      removeUploadedFile: (file) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((uf) => uf.file !== file),
        })),

      updateUploadedFile: (file, updates) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map((uf) =>
            uf.file.name === file.name && uf.file.size === file.size
              ? { ...uf, ...updates }
              : uf
          ),
        })),

      setSelectedFileIndex: (index) => set({ selectedFileIndex: index }),

      setIsDragActive: (active) => set({ isDragActive: active }),

      setValidationErrors: (errors) => set({ validationErrors: errors }),

      setAutoExtractZip: (enabled) => set({ autoExtractZip: enabled }),

      reset: () => set(initialState),
    }),
    { name: "NoteSettingsStore" }
  )
);
