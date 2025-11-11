/**
 * 협업 패널 (Liveblocks 실시간 버전)
 *
 * 모든 실시간 협업 기능 통합
 * - 접속자 목록
 * - Q&A (실시간 질문)
 * - 투표 (실시간 투표)
 */

"use client";

import { useState } from "react";
import { ActiveUsersPanel } from "./active-users-panel";
import { QAPanel } from "./qa-panel";
import { PollPanel } from "./poll-panel";
import { HandRaisePanel } from "./hand-raise-panel";
import { useEmojiReaction } from "./emoji-reactions";
import { AVAILABLE_EMOJIS, type AvailableEmoji } from "@/lib/types/collaboration";
import { Users, MessageCircle, BarChart3, Hand, Smile } from "lucide-react";

interface CollaborationPanelProps {
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
  className?: string;
}

type TabId = "users" | "qa" | "poll" | "handRaise" | "emoji";

const TABS = [
  { id: "users" as const, label: "접속자", icon: Users },
  { id: "handRaise" as const, label: "손들기", icon: Hand },
  { id: "qa" as const, label: "Q&A", icon: MessageCircle },
  { id: "poll" as const, label: "투표", icon: BarChart3 },
  { id: "emoji" as const, label: "이모지", icon: Smile },
];

export function CollaborationPanel({
  userId,
  userName,
  noteId,
  isEducator = false,
  className = "",
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("users");

  return (
    <div
      className={`flex flex-col w-full h-[380px] bg-[#2F2F2F] border-2 border-[#AFC02B] rounded-[10px] overflow-hidden transition-all duration-500 ease-out ${className}`}
      style={{
        animation: "expandPanel 0.5s ease-out forwards",
      }}
    >
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-[#444444]">
        <h3 className="text-white text-sm font-bold">실시간 협업</h3>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#444444] flex-shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#AFC02B] text-black"
                  : "bg-[#3f3f3f] text-white hover:bg-[#4f4f4f]"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {activeTab === "users" && <ActiveUsersPanel />}

        {activeTab === "handRaise" && (
          <HandRaisePanel
            userId={userId}
            userName={userName}
            isEducator={isEducator}
          />
        )}

        {activeTab === "qa" && (
          <QAPanel
            userId={userId}
            userName={userName}
            noteId={noteId}
            isEducator={isEducator}
          />
        )}

        {activeTab === "poll" && (
          <PollPanel
            userId={userId}
            noteId={noteId}
            isEducator={isEducator}
          />
        )}

        {activeTab === "emoji" && (
          <EmojiPanel
            userId={userId}
            userName={userName}
            noteId={noteId}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 이모지 반응 패널
 */
interface EmojiPanelProps {
  userId: string;
  userName: string;
  noteId: string;
}

function EmojiPanel({ userId, userName, noteId }: EmojiPanelProps) {
  const { sendEmoji } = useEmojiReaction(noteId, userId, userName);

  const handleEmojiClick = (emoji: AvailableEmoji) => {
    sendEmoji(emoji);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-center mb-2">
        <Smile size={32} className="text-[#AFC02B] mx-auto mb-2" />
        <h4 className="text-white text-sm font-medium mb-1">이모지 반응 보내기</h4>
        <p className="text-white/60 text-xs">모든 참여자에게 실시간으로 표시됩니다</p>
      </div>

      {/* 이모지 그리드 */}
      <div className="grid grid-cols-3 gap-3">
        {AVAILABLE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="w-16 h-16 flex items-center justify-center text-3xl bg-white/5 hover:bg-[#AFC02B]/20 rounded-lg transition-all hover:scale-110 active:scale-95 border border-white/10 hover:border-[#AFC02B]/50"
            title={`${emoji} 반응 보내기`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
