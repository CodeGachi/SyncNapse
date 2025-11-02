/**
 * script Translation Status Management Store * Record script Translation feature Management
*/ 
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SupportedLanguage, ScriptSegment } from "@/lib/types";

interface ScriptTranslationState {
  // Translation State
  scriptSegments: ScriptSegment[];
  isTranslationEnabled: boolean;
  targetLanguage: SupportedLanguage;
  originalLanguage: SupportedLanguage;

  // Translation Actions
  toggleTranslation: () => void;
  setTargetLanguage: (language: SupportedLanguage) => void;
  setScriptSegments: (segments: ScriptSegment[]) => void;
  updateSegmentTranslation: (id: string, translatedText: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  scriptSegments: [],
  isTranslationEnabled: false,
  targetLanguage: "en" as SupportedLanguage,
  originalLanguage: "ko" as SupportedLanguage,
};

export const useScriptTranslationStore = create<ScriptTranslationState>()(
  devtools(
    (set) => ({
      ...initialState,

      toggleTranslation: () =>
        set((state) => ({ isTranslationEnabled: !state.isTranslationEnabled })),

      setTargetLanguage: (language) => set({ targetLanguage: language }),

      setScriptSegments: (segments) => set({ scriptSegments: segments }),

      updateSegmentTranslation: (id, translatedText) =>
        set((state) => ({
          scriptSegments: state.scriptSegments.map((segment) =>
            segment.id === id ? { ...segment, translatedText } : segment
          ),
        })),

      reset: () => set(initialState),
    }),
    {
      name: "ScriptTranslationStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "scriptTranslationStore",
    }
  )
);
