/**
 * 공유 설정 모달 컴포넌트
 *
 * 노트 공유 설정을 모달 다이얼로그로 표시 및 관리
 * 일반 공유 및 실시간 협업 (Liveblocks) 기능 포함
 */

"use client";

import { useState } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("SharingSettingsModal");
import { Modal } from "@/components/common/modal";
import { Copy, Check, ExternalLink, Users, Globe, Lock, ChevronRight, RefreshCw } from "lucide-react";
import { useEducatorUIStore } from "@/stores";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/common/button";

export function SharingSettingsModal() {
  const {
    isSharingModalOpen,
    sharingModalNoteId,
    sharingModalNoteTitle,
    closeSharingModal
  } = useEducatorUIStore();

  // 공유 설정 상태 (내부에서 관리)
  const [settings, setSettings] = useState({
    isPublic: false,
    allowedUsers: [] as string[],
    allowComments: true,
    realTimeInteraction: true,
    shareLink: undefined as string | undefined,
  });

  const [newUserEmail, setNewUserEmail] = useState("");
  const [isCollaborating, setIsCollaborating] = useState(false);

  // Collaboration link state
  const [collaborativeLink, setCollaborativeLink] = useState<string | null>(null);
  const [isCopiedCollab, setIsCopiedCollab] = useState(false);
  const [isGeneratingCollab, setIsGeneratingCollab] = useState(false);
  const [isCopiedPublic, setIsCopiedPublic] = useState(false);

  // 공유 설정 핸들러들 (내부에서 처리)
  const handleTogglePublic = () => {
    setSettings(prev => {
      const nextIsPublic = !prev.isPublic;
      let nextShareLink = prev.shareLink;

      // 공개로 전환 시 링크가 없으면 자동 생성
      if (nextIsPublic && !nextShareLink && sharingModalNoteId) {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const token = `${sharingModalNoteId}-${timestamp}-${randomString}`;
        nextShareLink = `${window.location.origin}/shared/${token}`;
      }

      return {
        ...prev,
        isPublic: nextIsPublic,
        shareLink: nextShareLink
      };
    });
  };

  const handleToggleRealTimeInteraction = () => {
    setSettings(prev => ({ ...prev, realTimeInteraction: !prev.realTimeInteraction }));
  };

  const handleCopyShareLink = async () => {
    if (!sharingModalNoteId || !settings.shareLink) return;

    try {
      await navigator.clipboard.writeText(settings.shareLink);
      setIsCopiedPublic(true);
      setTimeout(() => setIsCopiedPublic(false), 2000);
    } catch (error) {
      log.error("링크 복사 실패:", error);
    }
  };

  // Generate collaboration link (Share Token for Students)
  const handleGenerateCollaborativeLink = async () => {
    if (!sharingModalNoteId) return;

    setIsGeneratingCollab(true);

    try {
      // Generate random share token for student access
      // Token format: {noteId}-{timestamp}-{randomString}
      const token = `${sharingModalNoteId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const link = `${window.location.origin}/shared/${token}`;

      setCollaborativeLink(link);
      setIsCollaborating(true);
    } catch (error) {
      log.error("협업 링크 생성 실패:", error);
      alert("협업 링크 생성에 실패했습니다.");
    } finally {
      setIsGeneratingCollab(false);
    }
  };

  // Copy collaboration link
  const handleCopyCollaborativeLink = async () => {
    if (!collaborativeLink) return;

    try {
      await navigator.clipboard.writeText(collaborativeLink);
      setIsCopiedCollab(true);
      setTimeout(() => setIsCopiedCollab(false), 2000);
    } catch (error) {
      log.error("협업 링크 복사 실패:", error);
      alert("복사에 실패했습니다.");
    }
  };

  // Open collaboration link in new tab
  const handleOpenCollaborativeLink = () => {
    if (!collaborativeLink) return;
    window.open(collaborativeLink, "_blank");
  };

  if (!isSharingModalOpen) return null;

  return (
    <Modal
      isOpen={isSharingModalOpen}
      onClose={closeSharingModal}
      title="공유 설정"
      contentClassName="bg-background-base border border-border shadow-2xl shadow-black/50 rounded-3xl p-0 flex flex-col w-full max-w-[520px] overflow-hidden"
    >
      <div className="p-6 flex flex-col gap-6">

        {/* 1. 공개 범위 카드 */}
        <div className="bg-background-surface rounded-2xl p-5 border border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings.isPublic ? 'bg-brand/20 text-brand' : 'bg-background-elevated text-foreground-secondary'}`}>
                {settings.isPublic ? <Globe size={20} /> : <Lock size={20} />}
              </div>
              <div>
                <h3 className="text-foreground font-semibold text-[15px]">공개 범위 설정</h3>
                <p className="text-foreground-secondary text-xs mt-0.5">
                  {settings.isPublic ? "누구나 링크를 통해 접근 가능" : "초대된 사용자만 접근 가능"}
                </p>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <button
              onClick={handleTogglePublic}
              className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${settings.isPublic ? 'bg-brand' : 'bg-background-overlay'}`}
            >
              <motion.div
                className="w-5 h-5 bg-gray-800 dark:bg-white rounded-full shadow-md"
                animate={{ x: settings.isPublic ? 20 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          <AnimatePresence>
            {settings.isPublic && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-border flex flex-col gap-4">
                  {/* 실시간 상호작용 옵션 */}
                  <div
                    onClick={handleToggleRealTimeInteraction}
                    className="flex items-center justify-between p-3 rounded-xl bg-background-elevated hover:bg-background-overlay transition-colors cursor-pointer group"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground transition-colors">실시간 상호작용 허용</span>
                      <span className="text-xs text-foreground-tertiary">손들기, 투표 등 협업 기능 활성화</span>
                    </div>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${settings.realTimeInteraction ? 'bg-brand border-brand' : 'border-foreground-tertiary'}`}>
                      {settings.realTimeInteraction && <Check size={14} className="text-background-base" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* 공개 링크 복사 UI 제거됨 */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Student 협업 링크 카드 */}
        <div className="bg-background-surface rounded-2xl p-5 border border-border flex flex-col gap-4 relative overflow-hidden">
          {/* Background Glow */}
          {isCollaborating && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-[60px] rounded-full pointer-events-none" />
          )}

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-background-elevated flex items-center justify-center text-foreground-secondary">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-foreground font-semibold text-[15px]">Student 협업 링크</h3>
              <p className="text-foreground-secondary text-xs mt-0.5">학생들과 실시간으로 노트를 공유합니다</p>
            </div>
          </div>

          {!collaborativeLink ? (
            <div className="flex flex-col items-center justify-center py-4 gap-3">
              <p className="text-foreground-tertiary text-xs text-center">
                링크를 생성하여 학생들을 초대하세요.<br />
                실시간 Q&A 및 반응 기능을 사용할 수 있습니다.
              </p>
              <Button
                variant="primary"
                onClick={handleGenerateCollaborativeLink}
                disabled={isGeneratingCollab}
                className="w-full"
              >
                {isGeneratingCollab ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="animate-spin" /> 생성 중...
                  </div>
                ) : (
                  "협업 링크 생성하기"
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-brand/10 border border-brand/20 rounded-xl p-3 flex items-start gap-3">
                <div className="mt-0.5 min-w-[16px]">
                  <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                    <Check size={10} className="text-background-base stroke-[4]" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-brand text-xs font-bold">협업 모드 활성화됨</p>
                  <p className="text-brand/80 text-[11px] leading-relaxed">
                    학생들이 이 링크로 접속하여 실시간으로 노트를 보고 상호작용할 수 있습니다.
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
                  onClick={handleOpenCollaborativeLink}
                >
                  <ExternalLink size={14} className="mr-2" />
                  새 탭에서 열기
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs h-9 bg-status-error/10 text-status-error hover:bg-status-error/20 border-transparent"
                  onClick={() => {
                    setIsCollaborating(false);
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
        <Button
          variant="secondary"
          onClick={closeSharingModal}
          className="px-8"
        >
          완료
        </Button>
      </div>
    </Modal>
  );
}
