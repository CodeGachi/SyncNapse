/**
 * 계정 복구 폼 훅
 * restore-form.tsx에서 분리된 비즈니스 로직
 */

"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { restoreAccount, permanentDeleteAccount } from "@/lib/api/services/auth.api";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("Restore");

export type RestoreStatus = "idle" | "loading" | "success" | "error";

export function useRestoreForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");
  const [status, setStatus] = useState<RestoreStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 토큰 유효성
  const hasToken = !!token;

  // 계정 복구 처리
  const handleRestore = async () => {
    if (!token) return;
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
    if (!token) return;
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

  // 삭제 확인 모달 열기/닫기
  const openDeleteConfirm = () => setShowDeleteConfirm(true);
  const closeDeleteConfirm = () => setShowDeleteConfirm(false);

  return {
    // 상태
    hasToken,
    status,
    errorMessage,
    showDeleteConfirm,

    // 핸들러
    handleRestore,
    handleDelete,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
}
