/**
 * 글로벌 로딩 인디케이터 컴포넌트
 * 노트 생성, 폴더 생성 등 진행 중인 작업을 화면 우측 하단에 표시
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGlobalLoadingStore } from "@/stores";
import { Spinner } from "./spinner";

export function GlobalLoadingIndicator() {
  const { tasks, isLoading } = useGlobalLoadingStore();

  if (!isLoading || tasks.length === 0) {
    return null;
  }

  const currentTask = tasks[tasks.length - 1];

  const getIcon = (type: string) => {
    switch (type) {
      case "note":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        );
      case "folder":
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-background-sidebar/95 border border-border-subtle rounded-xl shadow-lg shadow-black/20 backdrop-blur-xl">
          <Spinner size="xs" />
          <div className="flex items-center gap-2 text-foreground-secondary">
            {getIcon(currentTask.type)}
            <span className="text-sm font-medium">{currentTask.message}</span>
          </div>
          {tasks.length > 1 && (
            <span className="text-xs text-foreground-tertiary px-2 py-0.5 bg-foreground/10 rounded-full">
              +{tasks.length - 1}
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
