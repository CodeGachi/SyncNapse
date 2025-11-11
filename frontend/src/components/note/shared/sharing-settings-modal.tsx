/**
 * Sharing Settings Modal Component
 * Displays and manages note sharing settings in a modal dialog
 * Includes general sharing and real-time collaboration (Liveblocks) features
 */

"use client";

import { useState } from "react";
import { Modal } from "@/components/common/modal";
import { Copy, Check, ExternalLink, Users } from "lucide-react";
import type { NoteAccessControl } from "@/lib/types/domain";

interface SharingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NoteAccessControl;
  newUserEmail: string;
  onNewUserEmailChange: (email: string) => void;
  onAddUser: (email: string) => void;
  onRemoveUser: (email: string) => void;
  onTogglePublic: () => void;
  onToggleComments: () => void;
  onToggleRealTimeInteraction: () => void;
  onCopyShareLink: () => void;
  shareLink?: string;
  // Collaboration features
  noteId: string;
  noteTitle: string;
  isCollaborating: boolean;
  onStartCollaboration: () => void;
  onStopCollaboration: () => void;
}

export function SharingSettingsModal({
  isOpen,
  onClose,
  settings,
  newUserEmail,
  onNewUserEmailChange,
  onAddUser,
  onRemoveUser,
  onTogglePublic,
  onToggleComments,
  onToggleRealTimeInteraction,
  onCopyShareLink,
  shareLink,
  noteId,
  noteTitle,
  isCollaborating,
  onStartCollaboration,
  onStopCollaboration,
}: SharingSettingsModalProps) {
  // Collaboration link state
  const [collaborativeLink, setCollaborativeLink] = useState<string | null>(null);
  const [isCopiedCollab, setIsCopiedCollab] = useState(false);
  const [isGeneratingCollab, setIsGeneratingCollab] = useState(false);

  // Generate collaboration link (Share Token for Students)
  const handleGenerateCollaborativeLink = async () => {
    setIsGeneratingCollab(true);

    try {
      // Generate random share token for student access
      // Token format: {noteId}-{timestamp}-{randomString}
      const token = `${noteId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const link = `${window.location.origin}/shared/${token}`;

      setCollaborativeLink(link);
      onStartCollaboration();

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="fixed inset-0 z-40 transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      contentClassName="bg-[#3C3C3C] rounded-2xl shadow-2xl p-8 flex flex-col gap-6 w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
      closeButton={false}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">공유 설정</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* 공개 범위 섹션 */}
      <div className="border-b border-[#575757] pb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">공개 범위</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-[#4C4C4C] transition-colors">
            <input
              type="radio"
              checked={!settings.isPublic}
              onChange={onTogglePublic}
              className="w-4 h-4 accent-[#AFC02B]"
            />
            <div>
              <div className="text-sm font-medium text-white">
                초대된 사용자만
              </div>
              <div className="text-xs text-gray-400">
                초대한 사용자와 생성자만 접근 가능
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-[#4C4C4C] transition-colors">
            <input
              type="radio"
              checked={settings.isPublic}
              onChange={onTogglePublic}
              className="w-4 h-4 accent-[#AFC02B]"
            />
            <div>
              <div className="text-sm font-medium text-white">링크로 공개</div>
              <div className="text-xs text-gray-400">
                공유 링크를 아는 누구나 접근 가능
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 사용자 관리 섹션 (공개 범위가 아닐 때만) */}
      {!settings.isPublic && (
        <div className="border-b border-[#575757] pb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            사용자 추가
          </h3>

          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => onNewUserEmailChange(e.target.value)}
              placeholder="이메일 주소"
              className="flex-1 bg-[#575757] text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-[#AFC02B] placeholder-gray-400 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAddUser(newUserEmail);
                }
              }}
            />
            <button
              onClick={() => onAddUser(newUserEmail)}
              className="px-4 py-2 bg-[#AFC02B] text-white rounded-lg font-medium text-sm hover:bg-[#9DB025] transition-colors"
            >
              추가
            </button>
          </div>

          {/* 사용자 목록 */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(settings.allowedUsers || []).map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-3 bg-[#4C4C4C] rounded-lg"
              >
                <span className="text-sm text-gray-200">{email}</span>
                <button
                  onClick={() => onRemoveUser(email)}
                  className="text-gray-400 hover:text-red-400 transition-colors text-sm"
                >
                  제거
                </button>
              </div>
            ))}
            {(!settings.allowedUsers || settings.allowedUsers.length === 0) && (
              <div className="text-xs text-gray-500 p-3 text-center">
                초대된 사용자가 없습니다
              </div>
            )}
          </div>
        </div>
      )}

      {/* 권한 설정 섹션 */}
      <div className="border-b border-[#575757] pb-6">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">권한 설정</h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#4C4C4C] transition-colors cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">
                댓글 및 질문 허용
              </div>
              <div className="text-xs text-gray-400">
                학생들이 댓글을 달고 질문할 수 있습니다
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.allowComments}
              onChange={onToggleComments}
              className="w-4 h-4 accent-[#AFC02B]"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-[#4C4C4C] transition-colors cursor-pointer">
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
              onChange={onToggleRealTimeInteraction}
              className="w-4 h-4 accent-[#AFC02B]"
            />
          </label>
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
              value={shareLink || "링크 생성 중..."}
              readOnly
              className="flex-1 bg-[#4C4C4C] text-gray-300 px-3 py-2 rounded-lg text-sm truncate"
            />
            <button
              onClick={onCopyShareLink}
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
                  onStopCollaboration();
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
          onClick={onClose}
          className="px-6 py-2 bg-[#575757] text-white rounded-lg font-medium hover:bg-[#666666] transition-colors"
        >
          완료
        </button>
      </div>
    </Modal>
  );
}
