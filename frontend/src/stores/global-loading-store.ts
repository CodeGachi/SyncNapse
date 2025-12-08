/**
 * 글로벌 로딩 상태 관리 store
 * 노트 생성, 폴더 생성 등 오래 걸리는 작업의 진행 상태를 표시
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type LoadingTaskType = "note" | "folder";

interface LoadingTask {
  id: string;
  type: LoadingTaskType;
  message: string;
  startTime: number;
}

interface GlobalLoadingState {
  tasks: LoadingTask[];

  // 현재 진행 중인 작업이 있는지
  isLoading: boolean;

  // Actions
  startLoading: (type: LoadingTaskType, message: string) => string;
  stopLoading: (taskId: string) => void;
  clearAll: () => void;
}

let taskIdCounter = 0;

export const useGlobalLoadingStore = create<GlobalLoadingState>()(
  devtools(
    (set, get) => ({
      tasks: [],
      isLoading: false,

      startLoading: (type, message) => {
        const taskId = `${type}-${++taskIdCounter}-${Date.now()}`;
        const newTask: LoadingTask = {
          id: taskId,
          type,
          message,
          startTime: Date.now(),
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
          isLoading: true,
        }));

        return taskId;
      },

      stopLoading: (taskId) => {
        set((state) => {
          const newTasks = state.tasks.filter((t) => t.id !== taskId);
          return {
            tasks: newTasks,
            isLoading: newTasks.length > 0,
          };
        });
      },

      clearAll: () => {
        set({ tasks: [], isLoading: false });
      },
    }),
    {
      name: "GlobalLoadingStore",
      enabled: process.env.NODE_ENV === "development",
    }
  )
);
