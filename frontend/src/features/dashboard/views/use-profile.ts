/**
 * 프로필 페이지 훅
 * profile-content.tsx에서 분리된 비즈니스 로직
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/use-auth";
import { updateUserProfile, deleteAccount } from "@/lib/api/services/auth.api";
import { createLogger } from "@/lib/utils/logger";
import { useTheme } from "next-themes";

const log = createLogger("ProfileContent");

// 모달 타입
export type ModalType =
  | { type: "info"; title: string; message: string; onClose?: () => void }
  | { type: "success"; title: string; message: string; onClose?: () => void }
  | { type: "error"; title: string; message: string; onClose?: () => void }
  | { type: "confirm"; title: string; message: string; onConfirm: () => void }
  | null;

export function useProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 편집 모드 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 모달 상태
  const [modal, setModal] = useState<ModalType>(null);

  // 계정 삭제 모달 상태
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // user가 로드되면 editName 초기화
  useEffect(() => {
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user?.name]);

  // 모달 닫기
  const closeModal = useCallback(() => setModal(null), []);

  // 뒤로가기 핸들러
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // 편집 모드 시작
  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    if (!editName.trim()) {
      setModal({
        type: "error",
        title: "입력 오류",
        message: "이름을 입력해주세요.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // 백엔드 API로 사용자 정보 업데이트
      await updateUserProfile({ displayName: editName.trim() });

      // 사용자 정보 캐시 무효화 (사이드바도 업데이트됨)
      await queryClient.invalidateQueries({ queryKey: ["auth", "currentUser"] });

      setModal({
        type: "success",
        title: "저장 완료",
        message: "프로필이 저장되었습니다.",
      });
      setIsEditing(false);
    } catch (error) {
      log.error("프로필 저장 실패:", error);
      setModal({
        type: "error",
        title: "저장 실패",
        message: "프로필 저장에 실패했습니다.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editName, queryClient]);

  // 취소 핸들러
  const handleCancel = useCallback(() => {
    setEditName(user?.name || "");
    setIsEditing(false);
  }, [user?.name]);

  // 프로필 이미지 변경 핸들러
  const handleImageChange = useCallback(() => {
    setModal({
      type: "info",
      title: "준비 중",
      message: "프로필 이미지 변경 기능은 준비 중입니다.",
    });
  }, []);

  // 알림 설정 핸들러
  const handleNotificationSettings = useCallback(() => {
    setModal({
      type: "info",
      title: "준비 중",
      message: "알림 설정 기능은 준비 중입니다.",
    });
  }, []);

  // 계정 삭제 핸들러
  const handleDeleteAccount = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  // 계정 삭제 모달 닫기
  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  // 실제 계정 삭제 처리
  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteAccount();

      // 모달 닫기
      setIsDeleteModalOpen(false);

      // 성공 메시지 표시 - 확인 버튼 클릭 시 로그아웃
      setModal({
        type: "success",
        title: "계정 삭제 완료",
        message: "계정이 삭제되었습니다.\n\n30일 내에 다시 로그인하면 계정을 복구할 수 있습니다.",
        onClose: () => {
          window.location.href = "/auth/logout";
        },
      });
    } catch (error) {
      log.error("계정 삭제 실패:", error);
      setIsDeleteModalOpen(false);
      setModal({
        type: "error",
        title: "삭제 실패",
        message: "계정 삭제에 실패했습니다. 다시 시도해주세요.",
      });
    }
  }, []);

  // 테마 토글 핸들러
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return {
    // 사용자 데이터
    user,

    // 테마
    theme,
    mounted,
    toggleTheme,

    // 편집 상태
    isEditing,
    editName,
    setEditName,
    isSaving,

    // 모달 상태
    modal,
    isDeleteModalOpen,

    // 핸들러
    handleBack,
    startEditing,
    handleSave,
    handleCancel,
    handleImageChange,
    handleNotificationSettings,
    handleDeleteAccount,
    closeDeleteModal,
    handleConfirmDelete,
    closeModal,
  };
}
