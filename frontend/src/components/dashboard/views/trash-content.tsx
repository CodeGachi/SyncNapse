/**
 * 휴지통 컨텐츠 컴포넌트
 * 삭제된 노트 복구 및 영구 삭제 기능 제공
 */

"use client";

import { Trash2, RotateCcw, X, Clock, Info, AlertTriangle } from "lucide-react";
import { LoadingScreen } from "@/components/common/loading-screen";
import { Spinner } from "@/components/common/spinner";
import { useTrash } from "@/features/dashboard/views/use-trash";
import { motion } from "framer-motion";

export function TrashContent() {
  const {
    // 상태
    trashedNotes,
    isLoading,
    restoring,
    deleting,

    // 핸들러
    handleRestore,
    handlePermanentDelete,

    // 유틸리티
    formatDate,
    formatRelativeTime,
  } = useTrash();

  if (isLoading) {
    return <LoadingScreen message="휴지통을 불러오는 중..." />;
  }

  return (
    <main className="flex flex-col w-full h-screen overflow-y-auto p-8 bg-background-deep">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 - Glassmorphic 스타일 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8 p-6 bg-background-modal/80 backdrop-blur-md border border-border-subtle rounded-2xl shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-foreground/5 rounded-xl">
              <Trash2 className="w-8 h-8 text-brand" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">휴지통</h1>
              <p className="text-foreground-secondary text-sm mt-1">삭제된 노트를 복구하거나 영구 삭제할 수 있습니다</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-foreground/5 rounded-full border border-border text-sm text-foreground-secondary">
            {trashedNotes.length}개의 삭제된 노트
          </div>
        </motion.div>

        {
          trashedNotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-20 bg-background-base/40 rounded-2xl border border-border-subtle border-dashed"
            >
              <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-foreground-tertiary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground-secondary mb-2">
                휴지통이 비어있습니다
              </h3>
              <p className="text-sm text-foreground-tertiary">
                삭제된 노트가 여기에 표시됩니다
              </p>
            </motion.div>
          ) : (
            /* 삭제된 노트 목록 */
            <div className="space-y-3">
              {trashedNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-background-base/60 backdrop-blur-md hover:bg-background-base/80 border border-border-subtle hover:border-border rounded-xl p-6 flex items-center justify-between transition-all group shadow-md hover:shadow-lg"
                >
                  <div className="flex items-center gap-5 flex-1">
                    {/* 아이콘 */}
                    <div className="w-12 h-12 bg-gradient-to-br from-foreground/5 to-foreground/0 border border-border-subtle rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      📄
                    </div>

                    {/* 노트 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground font-semibold text-lg mb-1 truncate group-hover:text-brand transition-colors">
                        {note.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-foreground-secondary">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-foreground/5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(note.deletedAt)}
                        </span>
                        <span className="text-foreground-tertiary">•</span>
                        <span>{formatDate(note.deletedAt)}</span>
                        {note.folderName && (
                          <>
                            <span className="text-foreground-tertiary">•</span>
                            <span className="truncate text-foreground-tertiary">폴더: {note.folderName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleRestore(note.id, note.title)}
                      disabled={restoring === note.id || deleting === note.id}
                      className="px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand hover:text-brand-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 font-bold text-sm"
                    >
                      {restoring === note.id ? (
                        <>
                          <Spinner size="sm" className="border-brand/20" />
                          <span>복구 중...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>복구</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(note.id, note.title)}
                      disabled={restoring === note.id || deleting === note.id}
                      className="px-4 py-2 bg-foreground/5 hover:bg-status-error/20 border border-border hover:border-status-error/30 text-foreground-secondary hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 font-medium text-sm"
                    >
                      {deleting === note.id ? (
                        <>
                          <Spinner size="sm" className="border-red-400/20" />
                          <span>삭제 중...</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span>영구 삭제</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        }

        {/* 안내 박스 */}
        {
          trashedNotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="p-4 bg-brand/5 border border-brand/10 rounded-xl flex items-start gap-3 shadow-[0_0_15px_rgba(175,192,43,0.05)]">
                <div className="mt-0.5 p-1.5 bg-brand/10 rounded-lg text-brand">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-foreground-secondary font-medium">
                    복구 시 타임스탬프가 포함됩니다
                  </p>
                  <p className="text-xs text-foreground-tertiary">
                    예: &quot;노트이름_1731456789123&quot;
                  </p>
                </div>
              </div>
              <div className="p-4 bg-status-error/5 border border-status-error/10 rounded-xl flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                <div className="mt-0.5 p-1.5 bg-status-error/10 rounded-lg text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-foreground-secondary font-medium">
                    영구 삭제는 되돌릴 수 없습니다
                  </p>
                  <p className="text-xs text-foreground-tertiary">
                    노트와 모든 콘텐츠가 완전히 삭제됩니다.
                  </p>
                </div>
              </div>
            </motion.div>
          )
        }
      </div >
    </main >
  );
}
