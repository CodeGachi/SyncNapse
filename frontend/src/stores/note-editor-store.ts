/**
 * 노트 에디터 Core Store (리팩토링됨)
 * 패널 상태는 panels-store로, 번역 상태는 script-translation-store로 분리
 * PDF 페이지별 노트 기능 추가
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NoteBlock } from "@/features/note/text-notes/use-note-panel"; // ✅ text-notes
import type { FileItem } from "@/features/note/file/use-file-panel";
import type { Question, AutoSaveStatus } from "@/lib/types";
import type { Block } from "@blocknote/core";

/**
 * PDF 페이지별 노트 데이터 구조
 * Key: fileId-pageNumber (예: "file123-1", "file123-2")
 * Value: NoteBlock[]
 */
export interface PageNotes {
  [key: string]: NoteBlock[];
}

/**
 * 녹음 데이터 인터페이스
 */
export interface Recording {
  id: string;
  title: string;
  duration: number; // 초 단위
  createdAt: Date;
  audioUrl: string; // Blob URL
  audioBlob?: Blob; // 실제 오디오 데이터
  sessionId?: string; // Backend transcription session ID
}

interface NoteEditorState {
  // Note Blocks (DEPRECATED - 페이지별 노트로 대체)
  blocks: NoteBlock[];

  // Page-based Notes (NEW)
  pageNotes: PageNotes;
  currentPage: number;

  // File State
  files: FileItem[]; // 업로드된 모든 파일 목록
  openedTabs: string[]; // 탭에 열린 파일 ID 목록
  selectedFileId: string | null;

  // UI State
  activeTab: number;
  activeCategories: string[];
  isExpanded: boolean;

  // Player State
  isPlaying: boolean;
  currentTime: number;
  isRecordingExpanded: boolean;

  // Recording State
  recordings: Recording[];
  currentRecordingId: string | null;

  // Question State
  questions: Question[];
  isQuestionModalOpen: boolean;
  isQuestionListExpanded: boolean;

  // AutoSave State
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt: string | null;

  // Note Block Actions (DEPRECATED)
  addBlock: (afterId: string, type?: NoteBlock["type"]) => string;
  updateBlock: (id: string, updates: Partial<NoteBlock>) => void;
  deleteBlock: (id: string) => void;
  setBlocks: (blocks: NoteBlock[]) => void;

  // Page-based Note Actions (NEW)
  getPageKey: (fileId: string, page: number) => string;
  getCurrentPageBlocks: () => NoteBlock[];
  setCurrentPage: (page: number) => void;
  setPageNotes: (pageNotes: PageNotes) => void; // 공유 모드용
  addPageBlock: (afterId: string, type?: NoteBlock["type"]) => string;
  updatePageBlock: (id: string, updates: Partial<NoteBlock>) => void;
  deletePageBlock: (id: string) => void;
  initializePageNotes: (fileId: string, totalPages: number) => void;
  updatePageBlocksFromBlockNote: (blocks: Block[]) => void; // BlockNote 통합

  // File Actions
  addFile: (file: FileItem) => void;
  removeFile: (id: string) => void; // files 목록에서 완전히 삭제
  selectFile: (id: string) => void;
  setSelectedFileId: (id: string | null) => void; // 공유 모드용
  loadFiles: (files: FileItem[]) => void;
  setFiles: (files: FileItem[]) => void; // 공유 모드용
  renameFile: (id: string, newName: string) => void;
  copyFile: (id: string) => void;

  // Tab Actions
  openFileInTab: (fileId: string) => void; // 파일을 탭에 열기
  closeTab: (fileId: string) => void; // 탭에서만 닫기 (파일은 유지)
  getOpenedFiles: () => FileItem[]; // 탭에 열린 파일들 가져오기

  // UI Actions
  setActiveTab: (index: number) => void;
  toggleCategory: (category: string) => void;
  toggleExpand: () => void;

  // Player Actions
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  toggleRecordingExpanded: () => void;

  // Recording Actions
  addRecording: (recording: Omit<Recording, "id" | "audioUrl">) => void;
  removeRecording: (id: string) => void;
  updateRecordingTitle: (id: string, title: string) => void;
  selectRecording: (id: string) => void;
  clearRecordings: () => void;

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
  // Note Blocks (DEPRECATED)
  blocks: [
    {
      id: "1",
      type: "text" as const,
      content: "",
    },
  ],

  // Page-based Notes (NEW)
  pageNotes: {},
  currentPage: 1,

  // Files
  files: [],
  openedTabs: [],
  selectedFileId: null,

  // UI
  activeTab: 0,
  activeCategories: ["Notes"],
  isExpanded: false,

  // Player
  isPlaying: false,
  currentTime: 0,
  isRecordingExpanded: false,

  // Recording
  recordings: [],
  currentRecordingId: null,

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

      // Page-based Note Actions (NEW)
      getPageKey: (fileId, page) => `${fileId}-${page}`,

      getCurrentPageBlocks: () => {
        const state = get();
        if (!state.selectedFileId) return [];
        const pageKey = get().getPageKey(state.selectedFileId, state.currentPage);
        return state.pageNotes[pageKey] || [
          {
            id: `${pageKey}-1`,
            type: "text",
            content: "",
          },
        ];
      },

      setCurrentPage: (page) => set({ currentPage: page }),

      setPageNotes: (pageNotes) => set({ pageNotes }),

      addPageBlock: (afterId, type = "text") => {
        const state = get();
        if (!state.selectedFileId) return "";

        const pageKey = state.getPageKey(state.selectedFileId, state.currentPage);
        const currentBlocks = state.pageNotes[pageKey] || [];
        const index = currentBlocks.findIndex((b) => b.id === afterId);

        const newBlock: NoteBlock = {
          id: `${pageKey}-${Date.now()}`,
          type,
          content: "",
        };

        const newBlocks = [...currentBlocks];
        newBlocks.splice(index + 1, 0, newBlock);

        set({
          pageNotes: {
            ...state.pageNotes,
            [pageKey]: newBlocks,
          },
        });

        return newBlock.id;
      },

      updatePageBlock: (id, updates) => {
        const state = get();
        if (!state.selectedFileId) return;

        const pageKey = state.getPageKey(state.selectedFileId, state.currentPage);
        const currentBlocks = state.pageNotes[pageKey] || [];

        set({
          pageNotes: {
            ...state.pageNotes,
            [pageKey]: currentBlocks.map((block) =>
              block.id === id ? { ...block, ...updates } : block
            ),
          },
        });
      },

      deletePageBlock: (id) => {
        const state = get();
        if (!state.selectedFileId) return;

        const pageKey = state.getPageKey(state.selectedFileId, state.currentPage);
        const currentBlocks = state.pageNotes[pageKey] || [];

        if (currentBlocks.length === 1) return;

        set({
          pageNotes: {
            ...state.pageNotes,
            [pageKey]: currentBlocks.filter((block) => block.id !== id),
          },
        });
      },

      initializePageNotes: (fileId, totalPages) => {
        const state = get();
        const newPageNotes: PageNotes = { ...state.pageNotes };

        // 각 페이지에 대해 빈 노트 블록 초기화
        for (let page = 1; page <= totalPages; page++) {
          const pageKey = get().getPageKey(fileId, page);
          if (!newPageNotes[pageKey]) {
            newPageNotes[pageKey] = [
              {
                id: `${pageKey}-1`,
                type: "text",
                content: "",
              },
            ];
          }
        }

        set({ pageNotes: newPageNotes, currentPage: 1 });
      },

      updatePageBlocksFromBlockNote: (blocks) => {
        const state = get();
        if (!state.selectedFileId) return;

        const pageKey = state.getPageKey(state.selectedFileId, state.currentPage);

        // BlockNote의 Block[]을 NoteBlock[]으로 변환
        const convertedBlocks: NoteBlock[] = blocks.map((block, index) => {
          const blockType = mapBlockNoteTypeToNoteBlock(block.type);
          const content = getBlockContent(block);
          
          // Debug: Log block structure for troubleshooting
          if (index === 0) {
            console.log('[updatePageBlocksFromBlockNote] First block structure:', {
              blockType: block.type,
              blockId: block.id,
              rawBlock: block,
              extractedContent: content,
              contentLength: content.length,
            });
          }

          return {
            id: block.id || `${pageKey}-${index}`,
            type: blockType,
            content,
            checked: block.type === "checkListItem" ? (block.props as any)?.checked : undefined,
            indent: 0, // BlockNote는 기본적으로 들여쓰기를 자체적으로 관리
          };
        });

        console.log('[updatePageBlocksFromBlockNote] Converted blocks:', {
          pageKey,
          blockCount: convertedBlocks.length,
          firstBlockContent: convertedBlocks[0]?.content,
          allContents: convertedBlocks.map(b => ({ id: b.id, content: b.content })),
        });

        set({
          pageNotes: {
            ...state.pageNotes,
            [pageKey]: convertedBlocks,
          },
        });
      },

      // File Actions
      addFile: (file) =>
        set((state) => {
          const newFiles = [...state.files, file];
          // 파일 추가 시 탭에는 자동으로 열지 않음
          return { files: newFiles };
        }),

      removeFile: (id) =>
        set((state) => {
          const fileToRemove = state.files.find((f) => f.id === id);

          // URL 해제를 지연시켜 React DOM 업데이트 완료 후 실행
          // 이렇게 하면 removeChild 에러를 방지할 수 있음
          // PDF 뷰어의 경우 언마운트가 복잡하므로 더 긴 지연 시간 사용
          if (fileToRemove?.url) {
            setTimeout(() => {
              URL.revokeObjectURL(fileToRemove.url);
            }, 500);
          }

          const newFiles = state.files.filter((file) => file.id !== id);
          const newOpenedTabs = state.openedTabs.filter((tabId) => tabId !== id);

          let newSelectedId = state.selectedFileId;
          if (state.selectedFileId === id) {
            newSelectedId = newOpenedTabs.length > 0 ? newOpenedTabs[0] : null;
          }

          return {
            files: newFiles,
            openedTabs: newOpenedTabs,
            selectedFileId: newSelectedId
          };
        }),

      selectFile: (id) => set({ selectedFileId: id }),

      setSelectedFileId: (id) => set({ selectedFileId: id }),

      setFiles: (files) => set({ files }),

      loadFiles: (files) =>
        set((state) => {
          // 파일이 있고 현재 선택된 파일이 없으면 첫 번째 파일 선택
          const shouldSelectFirst = files.length > 0 && !state.selectedFileId;
          const newSelectedFileId = shouldSelectFirst ? files[0].id : state.selectedFileId;

          // 파일이 있고 탭이 비어있으면 첫 번째 파일을 탭에 열기
          const shouldOpenTab = files.length > 0 && state.openedTabs.length === 0;
          const newOpenedTabs = shouldOpenTab ? [files[0].id] : state.openedTabs;

          return {
            files,
            selectedFileId: newSelectedFileId,
            openedTabs: newOpenedTabs,
          };
        }),

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

      // Tab Actions
      openFileInTab: (fileId) =>
        set((state) => {
          // 이미 열려있으면 해당 탭으로 이동
          if (state.openedTabs.includes(fileId)) {
            const tabIndex = state.openedTabs.indexOf(fileId);
            return {
              activeTab: tabIndex,
              selectedFileId: fileId,
            };
          }

          // 새 탭 추가
          const newOpenedTabs = [...state.openedTabs, fileId];
          return {
            openedTabs: newOpenedTabs,
            activeTab: newOpenedTabs.length - 1,
            selectedFileId: fileId,
          };
        }),

      closeTab: (fileId) =>
        set((state) => {
          const newOpenedTabs = state.openedTabs.filter((id) => id !== fileId);

          let newActiveTab = state.activeTab;
          let newSelectedId = state.selectedFileId;

          // 닫은 탭이 현재 선택된 탭이면 다른 탭 선택
          if (state.selectedFileId === fileId) {
            if (newOpenedTabs.length > 0) {
              // 현재 탭 인덱스가 마지막이면 이전 탭으로, 아니면 현재 위치 유지
              const currentIndex = state.openedTabs.indexOf(fileId);
              const newIndex = currentIndex >= newOpenedTabs.length ? newOpenedTabs.length - 1 : currentIndex;
              newActiveTab = newIndex;
              newSelectedId = newOpenedTabs[newIndex];
            } else {
              newActiveTab = 0;
              newSelectedId = null;
            }
          } else {
            // 다른 탭을 닫은 경우 activeTab 인덱스 조정
            const closedIndex = state.openedTabs.indexOf(fileId);
            if (closedIndex < state.activeTab) {
              newActiveTab = state.activeTab - 1;
            }
          }

          return {
            openedTabs: newOpenedTabs,
            activeTab: newActiveTab,
            selectedFileId: newSelectedId,
          };
        }),

      getOpenedFiles: () => {
        const state = get();
        return state.openedTabs
          .map((id) => state.files.find((f) => f.id === id))
          .filter((f): f is FileItem => f !== undefined);
      },

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

      // Recording Actions
      addRecording: (recording) =>
        set((state) => {
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const audioUrl = recording.audioBlob
            ? URL.createObjectURL(recording.audioBlob)
            : "";

          const newRecording: Recording = {
            ...recording,
            id,
            audioUrl,
          };

          return {
            recordings: [...state.recordings, newRecording],
          };
        }),

      removeRecording: (id) =>
        set((state) => {
          // Blob URL 정리 (id 또는 sessionId로 찾기)
          const recording = state.recordings.find((r) => r.id === id || r.sessionId === id);
          if (recording?.audioUrl) {
            URL.revokeObjectURL(recording.audioUrl);
          }

          return {
            // id 또는 sessionId가 일치하는 항목 제거
            recordings: state.recordings.filter((r) => r.id !== id && r.sessionId !== id),
            currentRecordingId: state.currentRecordingId === id ? null : state.currentRecordingId,
          };
        }),

      updateRecordingTitle: (id, title) =>
        set((state) => ({
          recordings: state.recordings.map((r) =>
            r.id === id ? { ...r, title } : r
          ),
        })),

      selectRecording: (id) =>
        set({
          currentRecordingId: id,
          isPlaying: false,
          currentTime: 0,
        }),

      clearRecordings: () =>
        set((state) => {
          // 모든 Blob URL 정리
          state.recordings.forEach((r) => {
            if (r.audioUrl) {
              URL.revokeObjectURL(r.audioUrl);
            }
          });

          return {
            recordings: [],
            currentRecordingId: null,
            isPlaying: false,
            currentTime: 0,
          };
        }),

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

/**
 * BlockNote 타입을 NoteBlock 타입으로 변환
 */
function mapBlockNoteTypeToNoteBlock(type: string): NoteBlock["type"] {
  const typeMap: Record<string, NoteBlock["type"]> = {
    paragraph: "text",
    heading: "heading1", // 기본값, level에 따라 구분 필요
    bulletListItem: "bullet",
    numberedListItem: "numbered",
    checkListItem: "checkbox",
    code: "code",
  };

  return typeMap[type] || "text";
}

/**
 * BlockNote Block에서 텍스트 콘텐츠 추출
 */
function getBlockContent(block: Block): string {
  const content = (block as any).content;

  console.log('[getBlockContent] Extracting content:', {
    hasContent: !!content,
    contentType: Array.isArray(content) ? 'array' : typeof content,
    content: content,
  });

  if (!content) return "";

  // content가 InlineContent[] 형태인 경우
  if (Array.isArray(content)) {
    const extracted = content
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (item.type === "text" && item.text) return item.text;
        if (item.type === "link" && item.content) {
          // Handle links - extract text from link content
          return Array.isArray(item.content) 
            ? item.content.map((c: any) => c.text || '').join('')
            : '';
        }
        return "";
      })
      .join("");
    
    console.log('[getBlockContent] Extracted from array:', extracted);
    return extracted;
  }

  // content가 문자열인 경우
  if (typeof content === "string") {
    console.log('[getBlockContent] Content is string:', content);
    return content;
  }

  return "";
}
