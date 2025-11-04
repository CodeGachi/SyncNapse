/**
 * Hook for managing note sharing settings
 * Handles sharing configuration for educator notes
 */

import { useState } from "react";
import type { NoteAccessControl } from "@/lib/types/domain";

interface UseSharingSettingsProps {
  initialSettings?: NoteAccessControl;
}

export function useSharingSettings(props?: UseSharingSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [settings, setSettings] = useState<NoteAccessControl>(
    props?.initialSettings || {
      isPublic: false,
      allowedUsers: [],
      allowComments: true,
      realTimeInteraction: true,
    }
  );

  const [newUserEmail, setNewUserEmail] = useState("");

  // 공유 범위 변경 (전체 공개 <-> 초대된 사용자만)
  const togglePublic = () => {
    setSettings((prev) => ({
      ...prev,
      isPublic: !prev.isPublic,
    }));
  };

  // 개별 사용자 추가
  const addUser = (email: string) => {
    if (!email || !email.includes("@")) return;

    const updatedUsers = [...(settings.allowedUsers || [])];
    if (!updatedUsers.includes(email)) {
      updatedUsers.push(email);
      setSettings((prev) => ({
        ...prev,
        allowedUsers: updatedUsers,
      }));
      setNewUserEmail("");
    }
  };

  // 개별 사용자 제거
  const removeUser = (email: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedUsers: (prev.allowedUsers || []).filter((u) => u !== email),
    }));
  };

  // 댓글 허용 토글
  const toggleComments = () => {
    setSettings((prev) => ({
      ...prev,
      allowComments: !prev.allowComments,
    }));
  };

  // 실시간 상호작용 토글
  const toggleRealTimeInteraction = () => {
    setSettings((prev) => ({
      ...prev,
      realTimeInteraction: !prev.realTimeInteraction,
    }));
  };

  // 공유 링크 생성
  const generateShareLink = () => {
    if (settings.shareLink) return settings.shareLink;

    const token = Math.random().toString(36).substring(2, 15);
    const shareLink = `${window.location.origin}/shared/${token}`;

    setSettings((prev) => ({
      ...prev,
      shareLink,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
    }));

    return shareLink;
  };

  const copyShareLink = async () => {
    const link = generateShareLink();
    try {
      await navigator.clipboard.writeText(link);
      // 복사 성공 알림 (나중에 toast로 변경 가능)
      console.log("공유 링크가 복사되었습니다");
    } catch (error) {
      console.error("링크 복사 실패:", error);
    }
  };

  return {
    // State
    isOpen,
    settings,
    newUserEmail,

    // Setters
    setIsOpen,
    setNewUserEmail,

    // Actions
    togglePublic,
    addUser,
    removeUser,
    toggleComments,
    toggleRealTimeInteraction,
    generateShareLink,
    copyShareLink,
  };
}
