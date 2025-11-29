/**
 * script Translation Status Management Store * Record script Translation feature Management
*/
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SupportedLanguage, ScriptSegment } from "@/lib/types";

// 번역 에러 타입
export type TranslationErrorType =
  | 'config_error'    // API 키 미설정
  | 'auth_error'      // API 키 유효하지 않음
  | 'quota_exceeded'  // 한도 초과
  | 'api_error'       // 기타 API 에러
  | 'network_error';  // 네트워크 에러

// 저장 상태 타입
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// 사용량 정보
export interface TranslationUsageInfo {
  used: number;
  limit: number;
  remaining: number;
}

// 자동 저장 콜백 타입
export type SaveRevisionCallback = (sessionId: string, editedSegments: Record<string, string>) => Promise<void>;

interface ScriptTranslationState {
  // Translation State
  scriptSegments: ScriptSegment[];
  isTranslationEnabled: boolean;
  targetLanguage: SupportedLanguage;
  originalLanguage: SupportedLanguage;

  // Translation Status (DeepL)
  isTranslating: boolean;
  translationError: TranslationErrorType | null;
  usageInfo: TranslationUsageInfo | null;

  // Edit Mode State
  isEditMode: boolean;
  editedSegments: Record<string, string>;  // segmentId -> editedText
  saveStatus: SaveStatus;

  // 자동 저장 콜백 (세션 변경 시 호출)
  saveRevisionCallback: SaveRevisionCallback | null;

  // Translation Actions
  toggleTranslation: () => void;
  setTargetLanguage: (language: SupportedLanguage) => void;
  setScriptSegments: (segments: ScriptSegment[]) => void;
  addScriptSegment: (segment: ScriptSegment) => void;
  clearScriptSegments: () => void;
  updateSegmentTranslation: (id: string, translatedText: string) => void;

  // Translation Status Actions
  setIsTranslating: (isTranslating: boolean) => void;
  setTranslationError: (error: TranslationErrorType | null) => void;
  setUsageInfo: (info: TranslationUsageInfo | null) => void;

  // Edit Mode Actions
  setEditMode: (isEdit: boolean) => void;
  updateEditedSegment: (id: string, text: string) => void;
  revertSegment: (id: string) => void;
  resetEdits: () => void;
  setSaveStatus: (status: SaveStatus) => void;

  // 자동 저장 콜백 등록
  setSaveRevisionCallback: (callback: SaveRevisionCallback | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  scriptSegments: [],
  isTranslationEnabled: false,
  targetLanguage: "en" as SupportedLanguage,
  originalLanguage: "ko" as SupportedLanguage,
  isTranslating: false,
  translationError: null as TranslationErrorType | null,
  usageInfo: null as TranslationUsageInfo | null,
  // Edit Mode
  isEditMode: false,
  editedSegments: {} as Record<string, string>,
  saveStatus: 'idle' as SaveStatus,
  saveRevisionCallback: null as SaveRevisionCallback | null,
};

export const useScriptTranslationStore = create<ScriptTranslationState>()(
  devtools(
    (set) => ({
      ...initialState,

      toggleTranslation: () =>
        set((state) => ({ isTranslationEnabled: !state.isTranslationEnabled })),

      setTargetLanguage: (language) => set({ targetLanguage: language }),

      setScriptSegments: (segments) =>
        set((state) => {
          // 기존 번역 데이터 유지
          const translationMap = new Map(
            state.scriptSegments
              .filter(s => s.translatedText)
              .map(s => [s.id, s.translatedText])
          );

          // 새 세그먼트에 기존 번역 병합
          const mergedSegments = segments.map(segment => {
            const existingTranslation = translationMap.get(segment.id);
            return existingTranslation
              ? { ...segment, translatedText: existingTranslation }
              : segment;
          });

          return { scriptSegments: mergedSegments };
        }),

      addScriptSegment: (segment) =>
        set((state) => ({
          scriptSegments: [...state.scriptSegments, segment],
        })),

      clearScriptSegments: () => set({ scriptSegments: [] }),

      updateSegmentTranslation: (id, translatedText) =>
        set((state) => {
          const existingSegment = state.scriptSegments.find(s => s.id === id);
          console.log('[Store] updateSegmentTranslation:', {
            id,
            translatedText: translatedText?.substring(0, 20),
            found: !!existingSegment,
            existingIds: state.scriptSegments.map(s => s.id),
          });
          return {
            scriptSegments: state.scriptSegments.map((segment) =>
              segment.id === id ? { ...segment, translatedText } : segment
            ),
          };
        }),

      // Translation Status Actions
      setIsTranslating: (isTranslating) => set({ isTranslating }),
      setTranslationError: (error) => set({ translationError: error }),
      setUsageInfo: (info) => set({ usageInfo: info }),

      // Edit Mode Actions
      setEditMode: (isEdit) => set({ isEditMode: isEdit }),

      updateEditedSegment: (id, text) =>
        set((state) => ({
          editedSegments: { ...state.editedSegments, [id]: text },
          saveStatus: 'idle',  // 수정 시 저장 상태 초기화
        })),

      revertSegment: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.editedSegments;
          return { editedSegments: rest };
        }),

      resetEdits: () => set({ editedSegments: {}, saveStatus: 'idle' }),

      setSaveStatus: (status) => set({ saveStatus: status }),

      setSaveRevisionCallback: (callback) => set({ saveRevisionCallback: callback }),

      reset: () => set(initialState),
    }),
    {
      name: "ScriptTranslationStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "scriptTranslationStore",
    }
  )
);
