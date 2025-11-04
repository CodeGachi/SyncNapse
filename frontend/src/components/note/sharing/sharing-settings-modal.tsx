/**
 * Sharing Settings Modal Component
 * Displays and manages note sharing settings in a modal dialog
 */

"use client";

import { Modal } from "@/components/common/modal";
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
}: SharingSettingsModalProps) {
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
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            공유 링크
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
