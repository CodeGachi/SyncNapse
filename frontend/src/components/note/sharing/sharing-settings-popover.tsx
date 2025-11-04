/**
 * Sharing Settings Popover Component
 * Displays and manages note sharing settings for educator notes
 */

"use client";

import { useState, useRef, useEffect } from "react";
import type { NoteAccessControl } from "@/lib/types/domain";

interface SharingSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NoteAccessControl;
  onSettingsChange: (settings: NoteAccessControl) => void;
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

export function SharingSettingsPopover({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  newUserEmail,
  onNewUserEmailChange,
  onAddUser,
  onRemoveUser,
  onTogglePublic,
  onToggleComments,
  onToggleRealTimeInteraction,
  onCopyShareLink,
  shareLink,
}: SharingSettingsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-12 right-0 w-96 bg-[#3C3C3C] rounded-lg shadow-2xl p-6 z-50 border border-[#575757]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">공유 설정</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scope Toggle Section */}
      <div className="mb-6 pb-6 border-b border-[#575757]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">공개 범위</h4>
        </div>

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

      {/* User Management Section (when not public) */}
      {!settings.isPublic && (
        <div className="mb-6 pb-6 border-b border-[#575757]">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            사용자 추가
          </h4>

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

          {/* User List */}
          <div className="space-y-2">
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

      {/* Permissions Section */}
      <div className="mb-6 pb-6 border-b border-[#575757]">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">
          권한 설정
        </h4>

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

      {/* Share Link Section */}
      {settings.isPublic && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            공유 링크
          </h4>

          <div className="flex gap-2">
            <input
              type="text"
              value={shareLink || "링크 생성 중..."}
              readOnly
              className="flex-1 bg-[#4C4C4C] text-gray-300 px-3 py-2 rounded-lg text-sm truncate"
            />
            <button
              onClick={() => {
                onCopyShareLink();
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-[#575757] text-white hover:bg-[#666666]"
              }`}
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
