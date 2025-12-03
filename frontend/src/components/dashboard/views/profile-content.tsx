"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/use-auth";
import { updateUserProfile, deleteAccount } from "@/lib/api/services/auth.api";
import { AccountDeleteConfirmModal } from "@/components/dashboard/account-delete-confirm-modal";
import { motion, AnimatePresence } from "framer-motion";
import { createLogger } from "@/lib/utils/logger";
import { useTheme } from "next-themes";

const log = createLogger("ProfileContent");

// 모달 타입
type ModalType =
  | { type: "info"; title: string; message: string; onClose?: () => void }
  | { type: "success"; title: string; message: string; onClose?: () => void }
  | { type: "error"; title: string; message: string; onClose?: () => void }
  | { type: "confirm"; title: string; message: string; onConfirm: () => void }
  | null;

export function ProfileContent() {
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
  const closeModal = () => setModal(null);

  // 저장 핸들러
  const handleSave = async () => {
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
  };

  // 취소 핸들러
  const handleCancel = () => {
    setEditName(user?.name || "");
    setIsEditing(false);
  };

  // 프로필 이미지 변경 핸들러
  const handleImageChange = () => {
    setModal({
      type: "info",
      title: "준비 중",
      message: "프로필 이미지 변경 기능은 준비 중입니다.",
    });
  };

  // 알림 설정 핸들러
  const handleNotificationSettings = () => {
    setModal({
      type: "info",
      title: "준비 중",
      message: "알림 설정 기능은 준비 중입니다.",
    });
  };

  // 계정 삭제 핸들러
  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(true);
  };

  // 실제 계정 삭제 처리
  const handleConfirmDelete = async () => {
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
  };

  return (
    <div className="flex flex-col w-full h-screen bg-background-deep">
      {/* 헤더 - Glassmorphic 스타일 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-row items-center px-6 py-4 h-[74px] bg-background-modal/80 backdrop-blur-md border-b border-border-subtle z-10"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors mr-4 group"
        >
          <div className="p-2 rounded-full group-hover:bg-foreground/10 transition-colors">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.8333 10H4.16666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.99999 15.8333L4.16666 10L9.99999 4.16666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>
        <h1 className="text-foreground text-xl font-bold">마이페이지</h1>
      </motion.div>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 프로필 카드 - Glassmorphic 스타일 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-background-base/60 backdrop-blur-md rounded-2xl p-8 border border-border-subtle shadow-xl"
          >
            {/* 프로필 이미지 섹션 */}
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border-subtle">
              <div className="relative group">
                {user?.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={96}
                    height={96}
                    className="rounded-full border-2 border-brand shadow-[0_0_20px_rgba(175,192,43,0.2)]"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-brand to-brand-secondary rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_20px_rgba(175,192,43,0.3)]">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                {/* 프로필 이미지 변경 버튼 (편집 모드일 때만) */}
                {isEditing && (
                  <button
                    className="absolute bottom-0 right-0 w-8 h-8 bg-brand rounded-full flex items-center justify-center hover:bg-brand-hover transition-colors shadow-lg"
                    onClick={handleImageChange}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L14 4L8 10H6V8L12 2Z" fill="white" />
                      <path d="M2 14H14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {user?.name || "사용자"}
                </h2>
                <p className="text-foreground-secondary text-sm">{user?.email || "user@example.com"}</p>
              </div>
            </div>

            {/* 프로필 정보 */}
            <div className="space-y-6">
              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  이름
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-background-base/40 text-foreground px-4 py-3 rounded-xl border border-border outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all placeholder:text-foreground-tertiary"
                    placeholder="이름을 입력하세요"
                  />
                ) : (
                  <div className="bg-background-base/40 text-foreground px-4 py-3 rounded-xl border border-border-subtle">
                    {user?.name || "N/A"}
                  </div>
                )}
              </div>

              {/* 이메일 (편집 불가) */}
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  이메일
                </label>
                <div className="bg-background-base/40 text-foreground-secondary px-4 py-3 rounded-xl border border-border-subtle flex justify-between items-center">
                  <span>{user?.email || "N/A"}</span>
                  <span className="text-xs text-foreground-tertiary bg-foreground/5 px-2 py-1 rounded-md">변경 불가</span>
                </div>
              </div>

              {/* 계정 유형 */}
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  계정 유형
                </label>
                <div className="bg-background-base/40 text-foreground px-4 py-3 rounded-xl border border-border-subtle flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-success"></span>
                    Free Plan
                  </span>
                  <button className="text-brand text-sm font-medium hover:text-brand-hover transition-colors">
                    업그레이드
                  </button>
                </div>
              </div>

              {/* 가입일 */}
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-2">
                  가입일
                </label>
                <div className="bg-background-base/40 text-foreground px-4 py-3 rounded-xl border border-border-subtle">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                    : "N/A"}
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="mt-8 pt-6 border-t border-border-subtle">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium py-3 px-4 rounded-xl transition-all border border-border-subtle"
                    disabled={isSaving}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-br from-brand to-brand-secondary hover:shadow-[0_0_20px_rgba(175,192,43,0.3)] text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? "저장 중..." : "저장"}
                  </button>
                </div>
              ) : (
                <button
                  className="w-full bg-gradient-to-br from-brand to-brand-secondary hover:shadow-[0_0_20px_rgba(175,192,43,0.3)] text-white font-bold py-3 px-4 rounded-xl transition-all"
                  onClick={() => setIsEditing(true)}
                >
                  프로필 편집
                </button>
              )}
            </div>
          </motion.div>

          {/* 추가 설정 - Glassmorphic 스타일 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-background-base/60 backdrop-blur-md rounded-2xl p-6 border border-border-subtle shadow-xl"
          >
            <h3 className="text-foreground font-bold text-lg mb-4">계정 설정</h3>

            <div className="space-y-3">
              {/* 테마 설정 - Brand Aligned Design */}
              <motion.button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`relative w-full overflow-hidden rounded-xl border p-0 group transition-colors duration-300 ${mounted && theme === "dark"
                    ? "bg-background-base border-border-subtle"
                    : "bg-background-elevated border-border-subtle"
                  }`}
                whileTap={{ scale: 0.98 }}
              >
                {/* Content */}
                <div className="relative z-10 flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg backdrop-blur-sm shadow-sm transition-colors duration-300 ${mounted && theme === "dark" ? "bg-foreground/5" : "bg-background-base"
                      }`}>
                      <AnimatePresence mode="wait">
                        {mounted && theme === "dark" ? (
                          <motion.svg
                            key="moon"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            initial={{ rotate: -90, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            exit={{ rotate: 90, scale: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <path
                              d="M17.5 10.6333C17.3687 12.0304 16.8459 13.3613 16.0002 14.4723C15.1544 15.5833 14.0203 16.4305 12.7271 16.918C11.4339 17.4054 10.0324 17.5142 8.67994 17.2319C7.32752 16.9497 6.07711 16.2876 5.07142 15.3219C4.06572 14.3561 3.34628 13.1253 2.99508 11.7701C2.64387 10.4149 2.67505 8.99006 3.08507 7.65289C3.49509 6.31573 4.26765 5.11976 5.31589 4.19913C6.36412 3.2785 7.64627 2.67131 9.01667 2.44167C8.19485 3.62711 7.8285 5.06884 7.98616 6.50301C8.14382 7.93718 8.81519 9.26766 9.87545 10.2622C10.9357 11.2567 12.3135 11.8493 13.7619 11.9322C15.2102 12.0152 16.6402 11.5838 17.8 10.7167"
                              className="stroke-brand"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </motion.svg>
                        ) : (
                          <motion.svg
                            key="sun"
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            initial={{ rotate: 90, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            exit={{ rotate: -90, scale: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <circle cx="10" cy="10" r="4" className="stroke-brand" strokeWidth="1.5" />
                            <path d="M10 2V4" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M10 16V18" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M2 10H4" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M16 10H18" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M4.22 4.22L5.64 5.64" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M14.36 14.36L15.78 15.78" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M4.22 15.78L5.64 14.36" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M14.36 5.64L15.78 4.22" className="stroke-brand" strokeWidth="1.5" strokeLinecap="round" />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="font-medium transition-colors duration-300 text-foreground">테마</span>
                  </div>

                  {/* Right Side Toggle Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium mr-2 transition-colors duration-300 text-foreground-secondary">
                      {mounted && theme === "dark" ? "다크 모드" : "라이트 모드"}
                    </span>
                    <div className="w-12 h-6 rounded-full p-1 transition-colors duration-300 bg-background-overlay">
                      <motion.div
                        className="w-4 h-4 rounded-full shadow-sm bg-brand"
                        layout
                        transition={{ type: "spring", stiffness: 700, damping: 30 }}
                        animate={{
                          marginLeft: mounted && theme === "dark" ? "24px" : "0px"
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* 알림 설정 */}
              <button
                onClick={handleNotificationSettings}
                className="w-full flex items-center justify-between px-4 py-3 bg-background-base/40 rounded-xl border border-border-subtle hover:bg-foreground/5 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-foreground/5 group-hover:bg-foreground/10 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
                      <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13113C12.5979 2.19345 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19345 6.46447 3.13113C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5788 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42116 18.2537 9.16814 18.1079C8.91513 17.9622 8.70484 17.7526 8.55833 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-foreground font-medium">알림 설정</span>
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground-tertiary group-hover:text-foreground transition-colors">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* 계정 삭제 */}
              <button
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-between px-4 py-3 bg-background-base/40 rounded-xl border border-border-subtle hover:bg-status-error/10 hover:border-status-error/30 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-status-error/10 group-hover:bg-status-error/20 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-status-error">
                      <path d="M2.5 5H4.16667H17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-status-error font-medium group-hover:text-status-error/80">계정 삭제</span>
                </div>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-status-error/50 group-hover:text-status-error transition-colors">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 결과 모달 - Glassmorphic 스타일 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background-modal/90 border border-border rounded-2xl p-8 w-[400px] max-w-[90vw] shadow-2xl backdrop-blur-xl"
          >
            {/* 모달 아이콘 */}
            <div className="flex justify-center mb-6">
              {modal.type === "success" && (
                <div className="w-14 h-14 bg-status-success/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <svg className="w-7 h-7 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {modal.type === "error" && (
                <div className="w-14 h-14 bg-status-error/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  <svg className="w-7 h-7 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {modal.type === "info" && (
                <div className="w-14 h-14 bg-status-info/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <svg className="w-7 h-7 text-status-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              {modal.type === "confirm" && (
                <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                  <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
            </div>

            {/* 모달 제목 */}
            <h3 className="text-foreground text-xl font-bold text-center mb-3">
              {modal.title}
            </h3>

            {/* 모달 메시지 */}
            <p className="text-foreground-secondary text-center mb-8 whitespace-pre-line leading-relaxed">
              {modal.message}
            </p>

            {/* 모달 버튼 */}
            <div className="flex gap-3">
              {modal.type === "confirm" ? (
                <>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-foreground/5 hover:bg-foreground/10 text-foreground font-medium py-3 px-4 rounded-xl transition-colors border border-border-subtle"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      modal.onConfirm();
                    }}
                    className="flex-1 bg-status-error hover:bg-status-error/90 text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-lg shadow-status-error/20"
                  >
                    확인
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (modal.onClose) {
                      modal.onClose();
                    } else {
                      closeModal();
                    }
                  }}
                  className="w-full bg-gradient-to-br from-brand to-brand-secondary hover:shadow-[0_0_20px_rgba(175,192,43,0.3)] text-white font-bold py-3 px-4 rounded-xl transition-all"
                >
                  확인
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* 계정 삭제 확인 모달 */}
      <AccountDeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleConfirmDelete}
      />
    </div>
  );
}
