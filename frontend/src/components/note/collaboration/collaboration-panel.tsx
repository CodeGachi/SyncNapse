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
import { Panel } from "@/components/note/panels/panel";
import { ActiveUsersPanel } from "./active-users-panel";
import { QAPanel } from "./qa-panel";
import { PollPanel } from "./poll-panel";
import { HandRaisePanel } from "./hand-raise-panel";
import { useEmojiReaction } from "./emoji-reactions";
import { AVAILABLE_EMOJIS, type AvailableEmoji } from "@/lib/types/collaboration";
import { Users, MessageCircle, BarChart3, Hand, Smile } from "lucide-react";

interface CollaborationPanelProps {
  isOpen: boolean;
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
  onClose?: () => void;
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
  isOpen,
  userId,
  userName,
  noteId,
  isEducator = false,
  onClose,
  className = "",
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("users");

  return (
    <Panel
      isOpen={isOpen}
      borderColor="gray"
      title="실시간 협업"
      onClose={onClose}
    >
      <div className="flex flex-col h-full">
        {/* 탭 네비게이션 */}
        <div className="flex items-center px-4 pt-2 border-b border-[#444444] flex-shrink-0 bg-[#252525]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 relative group transition-all ${isActive ? "text-[#AFC02B]" : "text-gray-400 hover:text-gray-200"
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-[#AFC02B]/10" : "group-hover:bg-white/5"
                  }`}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[11px] font-medium ${isActive ? "text-[#AFC02B]" : "text-gray-500 group-hover:text-gray-300"}`}>
                  {tab.label}
                </span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#AFC02B] rounded-t-full mx-4" />
                )}
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
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
    </Panel>
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
    <div className="flex flex-col items-center justify-center h-full gap-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-[#AFC02B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smile size={32} className="text-[#AFC02B]" />
        </div>
        <h4 className="text-white text-lg font-bold">이모지 반응 보내기</h4>
        <p className="text-gray-400 text-sm max-w-[200px] mx-auto leading-relaxed">
          클릭하여 모든 참여자에게<br />실시간 반응을 보내보세요
        </p>
      </div>

      {/* 이모지 그리드 */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-[#252525] rounded-2xl border border-[#3c3c3c]">
        {AVAILABLE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="w-14 h-14 flex items-center justify-center text-3xl bg-[#2f2f2f] hover:bg-[#3f3f3f] rounded-xl transition-all hover:scale-110 active:scale-95 border border-transparent hover:border-[#AFC02B]/50 shadow-lg"
            title={`${emoji} 반응 보내기`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
