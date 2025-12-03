/**
 * 공유 설정 모달 컴포넌트
 *
 * 노트 공유 설정을 모달 다이얼로그로 표시 및 관리
 * - 공개 범위 설정 (비공개/읽기전용/편집가능)
 * - 협업자 초대 (이메일)
 * - 실시간 협업 링크 생성
 */

"use client";

import { useState, useEffect } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SharingSettingsModal");
import { Modal } from "@/components/common/modal";
import {
  Copy,
  Check,
  ExternalLink,
  Users,
  Globe,
  Lock,
  Mail,
  X,
  RefreshCw,
  UserPlus,
  Eye,
  Edit3,
  Trash2,
} from "lucide-react";
import { useEducatorUIStore } from "@/stores";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/common/button";
import {
  useCollaborators,
  useUpdatePublicAccess,
  useInviteCollaborator,
  useUpdateCollaboratorPermission,
  useRemoveCollaborator,
} from "@/lib/api/queries/sharing.queries";
import { useNote } from "@/lib/api/queries/notes.queries";
import {
  type PublicAccess,
  type NotePermission,
  generateShareLink,
} from "@/lib/api/services/sharing.api";

export function SharingSettingsModal() {
  const {
    isSharingModalOpen,
    sharingModalNoteId,
    sharingModalNoteTitle,
    closeSharingModal,
  } = useEducatorUIStore();

  // 공개 설정 상태
  const [publicAccess, setPublicAccess] = useState<PublicAccess>("PRIVATE");
  const [shareLink, setShareLink] = useState<string>("");

  // 협업자 초대 상태
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] =
    useState<NotePermission>("VIEWER");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // 실시간 협업 링크 상태
  const [collaborativeLink, setCollaborativeLink] = useState<string | null>(
    null
  );
  const [isCopiedCollab, setIsCopiedCollab] = useState(false);
  const [isCopiedPublic, setIsCopiedPublic] = useState(false);

  // API Queries & Mutations
  const { data: note } = useNote(sharingModalNoteId);
  const { data: collaborators, isLoading: isLoadingCollaborators } =
    useCollaborators(sharingModalNoteId);
  const updatePublicAccessMutation = useUpdatePublicAccess();
  const inviteCollaboratorMutation = useInviteCollaborator();
  const updatePermissionMutation = useUpdateCollaboratorPermission();
  const removeCollaboratorMutation = useRemoveCollaborator();

  // 모달 열릴 때 공유 링크 생성 및 현재 publicAccess 값 로드
  useEffect(() => {
    if (sharingModalNoteId && isSharingModalOpen) {
      setShareLink(generateShareLink(sharingModalNoteId));

      // 노트의 현재 publicAccess 값 로드
      if (note?.publicAccess) {
        setPublicAccess(note.publicAccess);
      } else {
        setPublicAccess("PRIVATE");
      }
    }
  }, [sharingModalNoteId, isSharingModalOpen, note?.publicAccess]);

  // 공개 설정 변경 핸들러
  const handlePublicAccessChange = (access: PublicAccess) => {
    if (!sharingModalNoteId) return;

    setPublicAccess(access);
    updatePublicAccessMutation.mutate(
      { noteId: sharingModalNoteId, publicAccess: access },
      {
        onError: (error) => {
          log.error("공개 설정 변경 실패:", error);
          // 롤백
          setPublicAccess(publicAccess);
        },
      }
    );
  };

  // 협업자 초대 핸들러
  const handleInviteCollaborator = async () => {
    if (!sharingModalNoteId || !inviteEmail.trim()) return;

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError("올바른 이메일 형식을 입력해주세요");
      return;
    }

    setInviteError(null);

    inviteCollaboratorMutation.mutate(
      {
        noteId: sharingModalNoteId,
        email: inviteEmail.trim(),
        permission: invitePermission,
      },
      {
        onSuccess: () => {
          setInviteEmail("");
          log.info("협업자 초대 성공:", inviteEmail);
        },
        onError: (error) => {
          setInviteError(error.message);
          log.error("협업자 초대 실패:", error);
        },
      }
    );
  };

  // 협업자 권한 변경 핸들러
  const handlePermissionChange = (
    collaboratorId: string,
    permission: NotePermission
  ) => {
    if (!sharingModalNoteId) return;

    updatePermissionMutation.mutate({
      noteId: sharingModalNoteId,
      collaboratorId,
      permission,
    });
  };

  // 협업자 제거 핸들러
  const handleRemoveCollaborator = (collaboratorId: string) => {
    if (!sharingModalNoteId) return;

    removeCollaboratorMutation.mutate({
      noteId: sharingModalNoteId,
      collaboratorId,
    });
  };

  // 공유 링크 복사
  const handleCopyShareLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopiedPublic(true);
      setTimeout(() => setIsCopiedPublic(false), 2000);
    } catch (error) {
      log.error("링크 복사 실패:", error);
    }
  };

  // 실시간 협업 링크 생성
  const handleGenerateCollaborativeLink = () => {
    if (!sharingModalNoteId) return;

    const token = `${sharingModalNoteId}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const link = `${window.location.origin}/shared/${token}`;
    setCollaborativeLink(link);

    // 공개 설정을 PUBLIC_EDIT으로 변경
    if (publicAccess === "PRIVATE") {
      handlePublicAccessChange("PUBLIC_EDIT");
    }
  };

  // 협업 링크 복사
  const handleCopyCollaborativeLink = async () => {
    if (!collaborativeLink) return;

    try {
      await navigator.clipboard.writeText(collaborativeLink);
      setIsCopiedCollab(true);
      setTimeout(() => setIsCopiedCollab(false), 2000);
    } catch (error) {
      log.error("협업 링크 복사 실패:", error);
    }
  };

  if (!isSharingModalOpen) return null;

  return (
    <Modal
      isOpen={isSharingModalOpen}
      onClose={closeSharingModal}
      title="공유 설정"
      contentClassName="bg-background-base border border-border shadow-2xl shadow-black/50 rounded-3xl p-0 flex flex-col w-[90vw] md:w-full max-w-[560px] overflow-hidden max-h-[85vh]"
    >
      <div className="p-6 flex flex-col gap-5 overflow-y-auto">
        {/* 1. 공개 범위 설정 카드 */}
        <div className="bg-background-surface rounded-2xl p-5 border border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                publicAccess !== "PRIVATE"
                  ? "bg-brand/20 text-brand"
                  : "bg-background-elevated text-foreground-secondary"
              }`}
            >
              {publicAccess !== "PRIVATE" ? (
                <Globe size={20} />
              ) : (
                <Lock size={20} />
              )}
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-[15px]">
                공개 범위 설정
              </h3>
              <p className="text-foreground-secondary text-xs mt-0.5">
                링크를 통한 접근 권한을 설정합니다
              </p>
            </div>
          </div>

          {/* 공개 범위 옵션 */}
          <div className="flex flex-col gap-2">
            {/* 비공개 */}
            <button
              onClick={() => handlePublicAccessChange("PRIVATE")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                publicAccess === "PRIVATE"
                  ? "border-brand bg-brand/5"
                  : "border-transparent bg-background-elevated hover:bg-background-overlay"
              }`}
            >
              <Lock
                size={18}
                className={
                  publicAccess === "PRIVATE"
                    ? "text-brand"
                    : "text-foreground-tertiary"
                }
              />
              <div className="flex-1 text-left">
                <p
                  className={`text-sm font-medium ${publicAccess === "PRIVATE" ? "text-brand" : "text-foreground"}`}
                >
                  비공개
                </p>
                <p className="text-xs text-foreground-tertiary">
                  소유자와 초대된 협업자만 접근
                </p>
              </div>
              {publicAccess === "PRIVATE" && (
                <Check size={18} className="text-brand" />
              )}
            </button>

            {/* 읽기 전용 */}
            <button
              onClick={() => handlePublicAccessChange("PUBLIC_READ")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                publicAccess === "PUBLIC_READ"
                  ? "border-brand bg-brand/5"
                  : "border-transparent bg-background-elevated hover:bg-background-overlay"
              }`}
            >
              <Eye
                size={18}
                className={
                  publicAccess === "PUBLIC_READ"
                    ? "text-brand"
                    : "text-foreground-tertiary"
                }
              />
              <div className="flex-1 text-left">
                <p
                  className={`text-sm font-medium ${publicAccess === "PUBLIC_READ" ? "text-brand" : "text-foreground"}`}
                >
                  링크가 있는 사람 - 보기만
                </p>
                <p className="text-xs text-foreground-tertiary">
                  누구나 링크로 읽기 가능
                </p>
              </div>
              {publicAccess === "PUBLIC_READ" && (
                <Check size={18} className="text-brand" />
              )}
            </button>

            {/* 편집 가능 */}
            <button
              onClick={() => handlePublicAccessChange("PUBLIC_EDIT")}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                publicAccess === "PUBLIC_EDIT"
                  ? "border-brand bg-brand/5"
                  : "border-transparent bg-background-elevated hover:bg-background-overlay"
              }`}
            >
              <Edit3
                size={18}
                className={
                  publicAccess === "PUBLIC_EDIT"
                    ? "text-brand"
                    : "text-foreground-tertiary"
                }
              />
              <div className="flex-1 text-left">
                <p
                  className={`text-sm font-medium ${publicAccess === "PUBLIC_EDIT" ? "text-brand" : "text-foreground"}`}
                >
                  링크가 있는 사람 - 편집 가능
                </p>
                <p className="text-xs text-foreground-tertiary">
                  누구나 링크로 편집 가능
                </p>
              </div>
              {publicAccess === "PUBLIC_EDIT" && (
                <Check size={18} className="text-brand" />
              )}
            </button>
          </div>

          {/* 공유 링크 (비공개가 아닐 때만 표시) */}
          <AnimatePresence>
            {publicAccess !== "PRIVATE" && shareLink && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-border">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-background-modal border border-border rounded-xl px-3 py-2.5 flex items-center overflow-hidden">
                      <span className="text-foreground-secondary text-xs truncate select-all">
                        {shareLink}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyShareLink}
                      className="shrink-0 w-10 h-10 p-0 flex items-center justify-center"
                    >
                      {isCopiedPublic ? <Check size={18} /> : <Copy size={18} />}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. 협업자 초대 카드 */}
        <div className="bg-background-surface rounded-2xl p-5 border border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center text-foreground-secondary">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-[15px]">
                협업자 초대
              </h3>
              <p className="text-foreground-secondary text-xs mt-0.5">
                이메일로 특정 사용자를 초대합니다
              </p>
            </div>
          </div>

          {/* 이메일 입력 */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleInviteCollaborator()}
                  placeholder="이메일 주소 입력"
                  className="w-full bg-background-elevated border border-border rounded-xl pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-brand"
                />
              </div>

              {/* 권한 선택 */}
              <select
                value={invitePermission}
                onChange={(e) =>
                  setInvitePermission(e.target.value as NotePermission)
                }
                className="bg-background-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-brand"
              >
                <option value="VIEWER">뷰어</option>
                <option value="EDITOR">편집자</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={handleInviteCollaborator}
                disabled={
                  !inviteEmail.trim() || inviteCollaboratorMutation.isPending
                }
                className="shrink-0 px-4"
              >
                {inviteCollaboratorMutation.isPending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  "초대"
                )}
              </Button>
            </div>

            {/* 에러 메시지 */}
            {inviteError && (
              <p className="text-status-error text-xs">{inviteError}</p>
            )}
          </div>

          {/* 협업자 목록 */}
          {isLoadingCollaborators ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw
                size={20}
                className="animate-spin text-foreground-tertiary"
              />
            </div>
          ) : collaborators && collaborators.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center gap-3 p-3 bg-background-elevated rounded-xl"
                >
                  <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">
                    {(collab.user?.displayName || collab.email)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {collab.user?.displayName || collab.email}
                    </p>
                    {collab.user?.displayName && (
                      <p className="text-xs text-foreground-tertiary truncate">
                        {collab.email}
                      </p>
                    )}
                  </div>

                  {/* 권한 변경 */}
                  <select
                    value={collab.permission}
                    onChange={(e) =>
                      handlePermissionChange(
                        collab.id,
                        e.target.value as NotePermission
                      )
                    }
                    className="bg-background-surface border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none"
                  >
                    <option value="VIEWER">뷰어</option>
                    <option value="EDITOR">편집자</option>
                  </select>

                  {/* 제거 버튼 */}
                  <button
                    onClick={() => handleRemoveCollaborator(collab.id)}
                    className="p-1.5 rounded-lg hover:bg-status-error/10 text-foreground-tertiary hover:text-status-error transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-foreground-tertiary text-xs text-center py-2">
              아직 초대된 협업자가 없습니다
            </p>
          )}
        </div>

        {/* 3. 실시간 협업 링크 카드 */}
        <div className="bg-background-surface rounded-2xl p-5 border border-border flex flex-col gap-4 relative overflow-hidden">
          {collaborativeLink && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-[60px] rounded-full pointer-events-none" />
          )}

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center text-foreground-secondary">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-[15px]">
                실시간 협업 링크
              </h3>
              <p className="text-foreground-secondary text-xs mt-0.5">
                학생들과 실시간으로 노트를 공유합니다
              </p>
            </div>
          </div>

          {!collaborativeLink ? (
            <div className="flex flex-col items-center justify-center py-4 gap-3">
              <p className="text-foreground-tertiary text-xs text-center">
                링크를 생성하여 학생들을 초대하세요.
                <br />
                실시간 Q&A 및 반응 기능을 사용할 수 있습니다.
              </p>
              <Button
                variant="primary"
                onClick={handleGenerateCollaborativeLink}
                className="w-full"
              >
                협업 링크 생성하기
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 flex items-start gap-3">
                <div className="mt-0.5 min-w-[16px]">
                  <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                    <Check
                      size={10}
                      className="text-background-base stroke-[4]"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-brand text-xs font-bold">
                    협업 모드 활성화됨
                  </p>
                  <p className="text-brand/80 text-[11px] leading-relaxed">
                    학생들이 이 링크로 접속하여 실시간으로 노트를 보고 상호작용할
                    수 있습니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 bg-background-modal border border-border rounded-xl px-3 py-2.5 flex items-center overflow-hidden">
                  <span className="text-foreground-secondary text-xs truncate select-all">
                    {collaborativeLink}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyCollaborativeLink}
                  className="shrink-0 w-10 h-10 p-0 flex items-center justify-center"
                >
                  {isCopiedCollab ? <Check size={18} /> : <Copy size={18} />}
                </Button>
              </div>

              <div className="flex gap-2 mt-1">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs h-9"
                  onClick={() => window.open(collaborativeLink, "_blank")}
                >
                  <ExternalLink size={14} className="mr-2" />
                  새 탭에서 열기
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs h-9 bg-status-error/10 text-status-error hover:bg-status-error/20 border-transparent"
                  onClick={() => setCollaborativeLink(null)}
                >
                  협업 종료
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-background-surface/50 flex justify-end">
        <Button variant="secondary" onClick={closeSharingModal} className="px-8">
          완료
        </Button>
      </div>
    </Modal>
  );
}
