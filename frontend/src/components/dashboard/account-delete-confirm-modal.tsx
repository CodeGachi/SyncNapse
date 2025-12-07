"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/common/button";
import { AnimatePresence, motion } from "framer-motion";

interface AccountDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}

export function AccountDeleteConfirmModal({
  isOpen,
  onClose,
  onDelete,
}: AccountDeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const CONFIRM_TEXT = "내 계정을 삭제합니다";
  const isConfirmed = confirmText === CONFIRM_TEXT;

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isDeleting, onClose]);

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setConfirmText("");
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmText("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* 모달 컨테이너 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ pointerEvents: "none" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
              className="bg-background-modal/95 backdrop-blur-xl rounded-3xl w-[440px] overflow-hidden border-2 border-status-error shadow-[0_25px_50px_-12px_rgba(220,38,38,0.5)]"
              style={{
                pointerEvents: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 경고 헤더 */}
              <div
                className="p-6 bg-gradient-to-r from-status-error/20 to-red-900/20 border-b border-status-error"
              >
                <div className="flex items-center gap-4">
                  {/* 경고 아이콘 */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-status-error/20 border border-status-error/50"
                  >
                    <motion.svg
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="w-7 h-7 text-status-error"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </motion.svg>
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-red-400">계정 삭제</h2>
                    <p className="text-sm text-red-300/60">이 작업은 되돌릴 수 없습니다</p>
                  </div>
                </div>
              </div>

              {/* 내용 */}
              <div className="p-6 flex flex-col gap-5">
                {/* 경고 박스 */}
                <div
                  className="rounded-xl p-4 bg-status-error/10 border border-status-error"
                >
                  <div className="flex gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium mb-2 text-red-300">
                        계정을 삭제하면 다음 데이터가 모두 삭제됩니다:
                      </p>
                      <ul className="space-y-1 list-disc list-inside text-red-300/70">
                        <li>모든 노트 및 폴더</li>
                        <li>녹음 파일 및 변환된 텍스트</li>
                        <li>프로필 정보</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 복구 안내 */}
                <div
                  className="rounded-xl p-4 bg-amber-500/10 border border-amber-600"
                >
                  <div className="flex gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-amber-300">30일 복구 기간</p>
                      <p className="mt-1 text-amber-300/70">
                        삭제 후 30일 내에 복구 토큰을 사용하여 계정을 복구할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 확인 입력 */}
                <div className="space-y-2">
                  <label className="text-sm text-foreground-secondary">
                    계속하려면 <span className="text-red-400 font-bold">&quot;{CONFIRM_TEXT}&quot;</span>를
                    입력하세요
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_TEXT}
                    disabled={isDeleting}
                    className="w-full text-foreground px-4 py-3 rounded-xl outline-none transition-all placeholder:text-foreground-tertiary disabled:opacity-50 bg-background-base/60 border border-status-error/50 focus:border-status-error focus:ring-1 focus:ring-status-error"
                  />
                </div>

                {/* 버튼 */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    variant="brand"
                    onClick={handleDelete}
                    disabled={!isConfirmed || isDeleting}
                    className="flex-1 bg-status-error hover:bg-status-error/90 disabled:bg-status-error/50 disabled:hover:bg-status-error/50 text-white shadow-lg shadow-status-error/30"
                  >
                    {isDeleting ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        삭제 중...
                      </span>
                    ) : (
                      "계정 삭제"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
