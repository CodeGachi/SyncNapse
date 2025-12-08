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
  QrCode,
} from "lucide-react";
import { useEducatorUIStore } from "@/stores";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/common/button";
import { QRCode } from "@/components/common/qr-code";
import {
  useCollaborators,
  useUpdatePublicAccess,
  useUpdateAllowedDomains,
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
import { createShortCode } from "@/lib/utils/url-shortener";

export function SharingSettingsModal() {
  const {
    isSharingModalOpen,
    sharingModalNoteId,
    sharingModalNoteTitle,
    closeSharingModal,
  } = useEducatorUIStore();

  // 공개 설정 상태
  const [publicAccess, setPublicAccess] = useState<PublicAccess>("PRIVATE");

  // 협업자 초대 상태
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] =
    useState<NotePermission>("VIEWER");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // 실시간 협업 링크 상태
  const [collaborativeLink, setCollaborativeLink] = useState<string | null>(null);
  const [isCopiedCollab, setIsCopiedCollab] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // 도메인 기반 공유 상태
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);

  // API Queries & Mutations
  const { data: note } = useNote(sharingModalNoteId);
  const { data: collaborators, isLoading: isLoadingCollaborators } =
    useCollaborators(sharingModalNoteId);
  const updatePublicAccessMutation = useUpdatePublicAccess();
  const updateAllowedDomainsMutation = useUpdateAllowedDomains();
  const inviteCollaboratorMutation = useInviteCollaborator();
  const updatePermissionMutation = useUpdateCollaboratorPermission();
  const removeCollaboratorMutation = useRemoveCollaborator();

  // Track if modal was just opened (to initialize only once)
  const [isInitialized, setIsInitialized] = useState(false);

  // 모달 열릴 때 현재 설정 값 로드 (한 번만, note가 로드된 후에만)
  useEffect(() => {
    // note가 로드되지 않았으면 대기
    if (!note) return;
    
    if (sharingModalNoteId && isSharingModalOpen && !isInitialized) {
      // 노트의 현재 publicAccess 값 로드 (최초 1회만)
      setPublicAccess(note.publicAccess || "PRIVATE");

      // 노트의 현재 allowedDomains 값 로드 (최초 1회만)
      setAllowedDomains(note.allowedDomains || []);

      setIsInitialized(true);
    }
  }, [sharingModalNoteId, isSharingModalOpen, note, isInitialized]);

  // 모달이 닫히면 초기화 상태 리셋
  useEffect(() => {
    if (!isSharingModalOpen) {
      setIsInitialized(false);
      // Note: 협업 링크는 리셋하지 않음 - 모달을 다시 열어도 유지됨
    }
  }, [isSharingModalOpen]);

  // 공개 설정 변경 핸들러
  const handlePublicAccessChange = (access: PublicAccess) => {
    if (!sharingModalNoteId) return;

    const previousAccess = publicAccess; // Capture previous value before change
    setPublicAccess(access);
    updatePublicAccessMutation.mutate(
      { noteId: sharingModalNoteId, publicAccess: access },
      {
        onSuccess: () => {
          log.info(`공개 설정 변경 성공: ${access}`);
        },
        onError: (error) => {
          log.error("공개 설정 변경 실패:", error);
          // Rollback to previous value
          setPublicAccess(previousAccess);
        },
      }
    );
  };

  // 도메인 추가 핸들러
  const handleAddDomain = () => {
    if (!sharingModalNoteId || !newDomain.trim()) return;

    // 도메인 형식 검증 (간단히)
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
    const domain = newDomain.trim().toLowerCase();
    
    if (!domainRegex.test(domain)) {
      setDomainError("올바른 도메인 형식을 입력해주세요 (예: ajou.ac.kr)");
      return;
    }

    if (allowedDomains.includes(domain)) {
      setDomainError("이미 추가된 도메인입니다");
      return;
    }

    setDomainError(null);
    const updatedDomains = [...allowedDomains, domain];
    setAllowedDomains(updatedDomains);
    setNewDomain("");

    updateAllowedDomainsMutation.mutate(
      { noteId: sharingModalNoteId, domains: updatedDomains },
      {
        onError: (error) => {
          log.error("도메인 추가 실패:", error);
          setAllowedDomains(allowedDomains); // 롤백
        },
      }
    );
  };

  // 도메인 제거 핸들러
  const handleRemoveDomain = (domain: string) => {
    if (!sharingModalNoteId) return;

    const updatedDomains = allowedDomains.filter(d => d !== domain);
    setAllowedDomains(updatedDomains);

    updateAllowedDomainsMutation.mutate(
      { noteId: sharingModalNoteId, domains: updatedDomains },
      {
        onError: (error) => {
          log.error("도메인 제거 실패:", error);
          setAllowedDomains(allowedDomains); // 롤백
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

  // 실시간 협업 링크 생성 (Short URL 사용)
  const handleGenerateCollaborativeLink = () => {
    if (!sharingModalNoteId) return;

    // 비공개 상태에서는 협업 링크를 생성할 수 없음
    if (publicAccess === "PRIVATE") {
      log.warn("비공개 상태에서는 협업 링크를 생성할 수 없습니다. 먼저 공개 범위를 설정해주세요.");
      return;
    }

    // Short URL 형식으로 협업 링크 생성
    const shortCode = createShortCode(sharingModalNoteId);
    const link = `${window.location.origin}/s/${shortCode}`;
    setCollaborativeLink(link);
    log.info(`협업 링크 생성 완료 (Short URL: ${shortCode}, 공개 범위: ${publicAccess})`);
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
      contentClassName="bg-background-base border border-border shadow-2xl shadow-black/50 rounded-3xl p-0 w-[90vw] md:w-full max-w-[560px] max-h-[85vh] flex flex-col"
    >
      <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">
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

        </div>

        {/* 2. 도메인 기반 공유 카드 */}
        <div className="bg-background-surface rounded-2xl p-5 border border-border flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center text-foreground-secondary">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-[15px]">
                도메인 기반 공유
              </h3>
              <p className="text-foreground-secondary text-xs mt-0.5">
                같은 이메일 도메인 사용자에게 자동 접근 허용
              </p>
            </div>
          </div>

          {/* 도메인 입력 */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => {
                    setNewDomain(e.target.value);
                    setDomainError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                  placeholder="ajou.ac.kr"
                  className="w-full bg-background-elevated border border-border rounded-xl pl-8 pr-3 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-brand"
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddDomain}
                disabled={!newDomain.trim() || updateAllowedDomainsMutation.isPending}
                className="shrink-0 px-4"
              >
                {updateAllowedDomainsMutation.isPending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  "추가"
                )}
              </Button>
            </div>

            {/* 에러 메시지 */}
            {domainError && (
              <p className="text-status-error text-xs">{domainError}</p>
            )}
          </div>

          {/* 허용된 도메인 목록 */}
          {allowedDomains.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allowedDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-full text-xs font-medium"
                >
                  <span>@{domain}</span>
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="hover:bg-brand/20 rounded-full p-0.5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-foreground-tertiary text-xs text-center py-2">
              아직 추가된 도메인이 없습니다
            </p>
          )}

          <p className="text-foreground-tertiary text-[11px] leading-relaxed">
            💡 예: <span className="font-medium">ajou.ac.kr</span>을 추가하면 
            <span className="font-medium"> user@ajou.ac.kr</span> 계정으로 로그인한 
            모든 사용자가 이 노트를 볼 수 있습니다.
          </p>
        </div>

        {/* 3. 협업자 초대 카드 */}
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
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-brand"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleInviteCollaborator()}
                  placeholder="예: user@example.com"
                  className="w-full bg-background-elevated border-2 border-border rounded-xl pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:border-brand focus:bg-brand/5 transition-colors"
                />
              </div>

              {/* 권한 선택 */}
              <select
                value={invitePermission}
                onChange={(e) =>
                  setInvitePermission(e.target.value as NotePermission)
                }
                className={`rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30 transition-colors ${
                  invitePermission === "EDITOR"
                    ? "bg-status-success/15 text-status-success border-2 border-status-success/30"
                    : "bg-blue-500/15 text-blue-600 border-2 border-blue-500/30"
                }`}
              >
                <option value="VIEWER">👁️ 뷰어</option>
                <option value="EDITOR">✏️ 편집자</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={handleInviteCollaborator}
                disabled={
                  !inviteEmail.trim() || inviteCollaboratorMutation.isPending
                }
                className="shrink-0 px-5 font-medium"
              >
                {inviteCollaboratorMutation.isPending ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  "✉️ 초대"
                )}
              </Button>
            </div>

            {/* 에러 메시지 */}
            {inviteError && (
              <div className="bg-status-error/10 border border-status-error/20 rounded-lg px-3 py-2">
                <p className="text-status-error text-xs font-medium">{inviteError}</p>
              </div>
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
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-brand/5 to-transparent border border-brand/10 rounded-xl hover:border-brand/20 transition-colors"
                >
                  {/* Avatar with gradient */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {(collab.user?.displayName || collab.user?.email || collab.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    {collab.user?.displayName && (
                      <p className="text-sm font-medium text-foreground truncate">
                        {collab.user.displayName}
                      </p>
                    )}
                    <p className="text-xs truncate">
                      <span className="text-foreground-tertiary">ID: </span>
                      <span className="text-brand font-medium">{collab.user?.email || collab.email}</span>
                    </p>
                  </div>

                  {/* 권한 배지 */}
                  <select
                    value={collab.permission}
                    onChange={(e) =>
                      handlePermissionChange(
                        collab.id,
                        e.target.value as NotePermission
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                      collab.permission === "EDITOR"
                        ? "bg-status-success/15 text-status-success border border-status-success/30"
                        : "bg-blue-500/15 text-blue-600 border border-blue-500/30"
                    }`}
                  >
                    <option value="VIEWER">👁️ 뷰어</option>
                    <option value="EDITOR">✏️ 편집자</option>
                  </select>

                  {/* 제거 버튼 */}
                  <button
                    onClick={() => handleRemoveCollaborator(collab.id)}
                    className="p-2 rounded-full hover:bg-status-error/15 text-foreground-tertiary hover:text-status-error transition-all hover:scale-110"
                    title="협업자 제거"
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

        {/* 4. 실시간 협업 링크 카드 */}
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
              {publicAccess === "PRIVATE" ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-status-warning/10 flex items-center justify-center mb-1">
                    <Lock size={24} className="text-status-warning" />
                  </div>
                  <p className="text-foreground-tertiary text-xs text-center">
                    협업 링크를 생성하려면 먼저
                    <br />
                    <span className="text-foreground-secondary font-medium">공개 범위를 설정</span>해주세요.
                  </p>
                  <p className="text-foreground-tertiary text-[10px] text-center opacity-70">
                    위의 &quot;링크가 있는 사람 - 보기&quot; 또는 &quot;편집&quot;을 선택하세요.
                  </p>
                </>
              ) : (
                <>
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
                    협업 링크 생성하기 ({publicAccess === "PUBLIC_READ" ? "보기 전용" : "편집 가능"})
                  </Button>
                </>
              )}
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

              {/* Short URL and Copy */}
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
                  title="링크 복사"
                >
                  {isCopiedCollab ? <Check size={18} /> : <Copy size={18} />}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowQRCode(!showQRCode)}
                  className={`shrink-0 w-10 h-10 p-0 flex items-center justify-center ${showQRCode ? 'bg-brand/20 text-brand' : ''}`}
                  title="QR 코드 보기"
                >
                  <QrCode size={18} />
                </Button>
              </div>

              {/* QR Code Display */}
              <AnimatePresence>
                {showQRCode && collaborativeLink && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-3 border border-border">
                      <QRCode 
                        value={collaborativeLink}
                        size={160}
                      />
                      <p className="text-foreground-secondary text-xs text-center">
                        QR 코드를 스캔하여 공유 링크에 접속하세요
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full URL (collapsible) */}
              <details className="text-xs">
                <summary className="text-foreground-tertiary cursor-pointer hover:text-foreground-secondary">
                  전체 URL 보기
                </summary>
                <div className="mt-2 bg-background-modal border border-border rounded-xl px-3 py-2 break-all">
                  <span className="text-foreground-secondary text-xs select-all">
                    {collaborativeLink}
                  </span>
                </div>
              </details>

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
                  onClick={() => {
                    // 협업 종료 시 노트를 비공개로 전환
                    handlePublicAccessChange("PRIVATE");
                    setCollaborativeLink(null);
                  }}
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
