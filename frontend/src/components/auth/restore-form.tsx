/**
 * 계정 복구 폼 컴포넌트
 *
 * 삭제 요청된 계정의 복구 또는 영구 삭제 처리
 */

"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAccount, permanentDeleteAccount } from "@/lib/api/auth.api";
import { createLogger } from "@/lib/utils/logger";
import Link from "next/link";
import { motion } from "framer-motion";

const log = createLogger("Restore");

export function RestoreForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 토큰이 없는 경우
  if (!token) {
    log.warn("복구 토큰 없음");
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-deep p-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background-modal/90 backdrop-blur-xl p-8 rounded-3xl border border-border-subtle shadow-2xl max-w-md w-full"
        >
          <div className="w-16 h-16 bg-status-error/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-status-error/30">
            <svg className="w-8 h-8 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-4">유효하지 않은 접근입니다</h1>
          <p className="mb-6 text-foreground-secondary">복구 토큰이 제공되지 않았습니다.</p>
          <Link
            href="/login"
            className="inline-block w-full py-3 px-4 bg-gradient-to-br from-brand to-brand-secondary hover:shadow-[0_0_20px_rgba(175,192,43,0.3)] text-black rounded-xl font-medium transition-all"
          >
            로그인 페이지로 이동
          </Link>
        </motion.div>
      </div>
    );
  }

  // 계정 복구 처리
  const handleRestore = async () => {
    try {
      setStatus("loading");
      log.info("계정 복구 시도");
      await restoreAccount(token);
      setStatus("success");
      log.info("계정 복구 성공");
      setTimeout(() => {
        router.push("/login?restored=true");
      }, 2000);
    } catch {
      setStatus("error");
      setErrorMessage("계정 복구에 실패했습니다. 토큰이 만료되었거나 유효하지 않습니다.");
      log.error("계정 복구 실패");
    }
  };

  // 계정 영구 삭제 처리
  const handleDelete = async () => {
    try {
      setStatus("loading");
      log.info("계정 영구 삭제 시도");
      await permanentDeleteAccount(token);
      log.info("계정 영구 삭제 성공");
      router.push("/login");
    } catch {
      setStatus("error");
      setErrorMessage("계정 삭제에 실패했습니다.");
      setShowDeleteConfirm(false);
      log.error("계정 영구 삭제 실패");
    }
  };

  // 복구 성공 화면
  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-deep p-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-background-modal/90 backdrop-blur-xl p-8 rounded-3xl border border-border-subtle shadow-2xl max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
            className="w-16 h-16 bg-status-success/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-status-success/30"
          >
            <svg className="w-8 h-8 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-2">계정 복구 완료!</h1>
          <p className="text-foreground-secondary">잠시 후 로그인 페이지로 이동합니다...</p>
        </motion.div>
      </div>
    );
  }

  // 메인 복구/삭제 선택 화면
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-deep p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background-modal/90 backdrop-blur-xl p-8 rounded-3xl border border-border-subtle shadow-2xl max-w-md w-full text-center"
      >
        <div className="mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
            className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/30"
          >
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-2">삭제 요청된 계정입니다</h1>
          <p className="text-foreground-secondary">
            이 계정은 현재 삭제 대기 상태입니다.<br/>
            <span className="text-yellow-400">(데이터 보관 기간: 30일)</span>
          </p>
          <p className="mt-3 text-sm text-foreground-tertiary">
            계정을 복구하거나 영구적으로 삭제할 수 있습니다.
          </p>
        </div>

        {status === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-status-error/10 border border-status-error/30 rounded-xl text-sm text-status-error"
          >
            {errorMessage}
          </motion.div>
        )}

        {!showDeleteConfirm ? (
          <div className="space-y-3">
            <button
              onClick={handleRestore}
              disabled={status === "loading"}
              className="w-full py-3 px-4 bg-gradient-to-br from-brand to-brand-secondary hover:shadow-[0_0_20px_rgba(175,192,43,0.3)] text-black rounded-xl font-medium transition-all disabled:opacity-50"
            >
              {status === "loading" ? "처리 중..." : "계정 복구하기"}
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={status === "loading"}
              className="w-full py-3 px-4 bg-transparent border border-status-error/30 text-status-error hover:bg-status-error/10 rounded-xl font-medium transition-all disabled:opacity-50"
            >
              영구 삭제하기
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="p-4 bg-status-error/10 border border-status-error/30 rounded-xl">
              <p className="text-status-error text-sm font-medium mb-2">
                정말로 계정을 영구 삭제하시겠습니까?
              </p>
              <p className="text-status-error/70 text-xs">
                이 작업은 되돌릴 수 없으며 모든 데이터가 즉시 삭제됩니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={status === "loading"}
                className="flex-1 py-3 px-4 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl font-medium transition-all disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={status === "loading"}
                className="flex-1 py-3 px-4 bg-status-error hover:bg-status-error/90 text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-status-error/30"
              >
                {status === "loading" ? "삭제 중..." : "영구 삭제"}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
