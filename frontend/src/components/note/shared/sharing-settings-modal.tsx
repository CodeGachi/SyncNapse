/**
 * Sharing Settings Modal Component
 * Displays and manages note sharing settings in a modal dialog
 * Includes general sharing and real-time collaboration (Liveblocks) features
 */

"use client";

import { useState } from "react";
import { Modal } from "@/components/common/modal";
import { Copy, Check, ExternalLink, Users } from "lucide-react";
import { useEducatorUIStore } from "@/stores";

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

  // 공유 설정 핸들러들 (내부에서 처리)
  const handleTogglePublic = () => {
    setSettings(prev => ({ ...prev, isPublic: !prev.isPublic }));
  };

  const handleAddUser = () => {
    if (!newUserEmail || !newUserEmail.includes("@")) return;
    if (settings.allowedUsers.includes(newUserEmail)) return;

    setSettings(prev => ({
      ...prev,
      allowedUsers: [...prev.allowedUsers, newUserEmail]
    }));
    setNewUserEmail("");
  };

  const handleRemoveUser = (email: string) => {
    setSettings(prev => ({
      ...prev,
      allowedUsers: prev.allowedUsers.filter(u => u !== email)
    }));
  };

  const handleToggleComments = () => {
    setSettings(prev => ({ ...prev, allowComments: !prev.allowComments }));
  };

  const handleToggleRealTimeInteraction = () => {
    setSettings(prev => ({ ...prev, realTimeInteraction: !prev.realTimeInteraction }));
  };

  const handleCopyShareLink = async () => {
    if (!sharingModalNoteId) return;

    if (!settings.shareLink) {
      // 공유 링크 생성
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const token = `${sharingModalNoteId}-${timestamp}-${randomString}`;
      const shareLink = `${window.location.origin}/shared/${token}`;

      setSettings(prev => ({ ...prev, shareLink }));

      try {
        await navigator.clipboard.writeText(shareLink);
        console.log("공유 링크가 복사되었습니다:", shareLink);
      } catch (error) {
        console.error("링크 복사 실패:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(settings.shareLink);
        console.log("공유 링크가 복사되었습니다:", settings.shareLink);
      } catch (error) {
        console.error("링크 복사 실패:", error);
      }
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

      console.log(`[Share Link] 생성 완료: ${link}`);
      console.log(`[Share Link] Token: ${token}`);
    } catch (error) {
      console.error("Failed to generate collaboration link:", error);
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
      console.error("Failed to copy:", error);
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
      contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-8 flex flex-col gap-6 w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
    >

      {/* 공개 범위 섹션 */}
      <div className="border-b border-[#575757] pb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">공개 범위</h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#4C4C4C] transition-colors">
            <input
              type="radio"
              id="share-invite-only"
              checked={!settings.isPublic}
              onChange={handleTogglePublic}
              className="w-4 h-4 accent-[#AFC02B] mt-1"
            />
            <div className="flex-1">
              <label htmlFor="share-invite-only" className="text-sm font-medium text-white cursor-pointer block mb-2">
                초대된 사용자만
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-[#3f3f3f] hover:bg-[#4a4a4a] transition-colors cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-white">
                    실시간 상호작용
                  </div>
                  <div className="text-xs text-gray-400">
                    손들기, 투표 등 실시간 기능 활성화
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.realTimeInteraction}
                  onChange={handleToggleRealTimeInteraction}
                  className="w-4 h-4 accent-[#AFC02B]"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 공유 링크 섹션 */}
      {settings.isPublic && (
        <div className="border-b border-[#575757] pb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            공개 공유 링크
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              value={settings.shareLink || "링크 생성 중..."}
              readOnly
              className="flex-1 bg-[#4C4C4C] text-gray-300 px-3 py-2 rounded-lg text-sm truncate"
            />
            <button
              onClick={handleCopyShareLink}
              className="px-4 py-2 bg-[#AFC02B] text-white rounded-lg font-medium text-sm hover:bg-[#9DB025] transition-colors"
            >
              복사
            </button>
          </div>
        </div>
      )}

      {/* 실시간 협업 링크 섹션 */}
      <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Student 공유 링크</span>
            </div>
          </h3>

          {!collaborativeLink ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-4">
                Student들과 실시간으로 협업할 수 있는 공유 링크를 생성하세요
              </p>
              {isCollaborating && (
                <div className="bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg p-3 mb-4">
                  <p className="text-green-300 text-sm">
                    ✅ 협업 모드가 활성화되었습니다!
                  </p>
                </div>
              )}
              <button
                onClick={handleGenerateCollaborativeLink}
                disabled={isGeneratingCollab}
                className="px-6 py-2 bg-[#AFC02B] text-[#1E1E1E] rounded-lg font-medium text-sm hover:bg-[#9DB025] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingCollab ? "생성 중..." : isCollaborating ? "새 공유 링크 생성" : "공유 링크 생성"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 협업 링크 입력 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={collaborativeLink}
                    readOnly
                    className="flex-1 bg-[#4C4C4C] text-gray-300 px-3 py-2 rounded-lg text-sm truncate"
                  />
                  <button
                    onClick={handleCopyCollaborativeLink}
                    title="복사"
                    className="px-4 py-2 bg-[#4C4C4C] hover:bg-[#575757] rounded-lg transition-colors"
                  >
                    {isCopiedCollab ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Copy size={18} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg p-3">
                <p className="text-blue-300 text-xs">
                  💡 이 링크를 통해 접속한 Student는:
                </p>
                <ul className="text-blue-200 text-xs mt-2 space-y-1 list-disc list-inside">
                  <li>공유된 노트를 실시간으로 확인할 수 있습니다</li>
                  <li>Q&A, 손들기, 투표 등 협업 기능을 사용할 수 있습니다</li>
                  <li>이모지 반응을 보낼 수 있습니다</li>
                </ul>
              </div>

              {/* 액션 버튼 */}
              <button
                onClick={handleOpenCollaborativeLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#4C4C4C] hover:bg-[#575757] text-white rounded-lg transition-colors text-sm"
              >
                <ExternalLink size={16} />
                <span>새 탭에서 열기</span>
              </button>

              {/* 협업 종료 버튼 */}
              {isCollaborating && (
                <button
                  onClick={() => {
                    setIsCollaborating(false);
                    setCollaborativeLink(null);
                  }}
                  className="w-full px-4 py-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
                >
                  협업 종료
                </button>
              )}
            </div>
          )}
      </div>

      {/* 닫기 버튼 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#575757]">
        <button
          onClick={closeSharingModal}
          className="px-6 py-2 bg-[#575757] text-white rounded-lg font-medium hover:bg-[#666666] transition-colors"
        >
          완료
        </button>
      </div>
    </Modal>
  );
}
