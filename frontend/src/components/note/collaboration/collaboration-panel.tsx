/**
 * 협업 패널 - 모든 실시간 협업 기능 통합
 * 손들기, 투표, 이모지, Q&A를 탭으로 관리
 */

"use client";

import { useCollaborationStore } from "@/stores/collaboration-store";
import { HandRaisePanel } from "./hand-raise-panel";
import { PollPanel } from "./poll-panel";
import { EmojiReactionsPanel } from "./emoji-reactions";
import { QAPanel } from "./qa-panel";

interface CollaborationPanelProps {
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
  className?: string;
}

const TABS = [
  { id: "hands", label: "✋ 손들기", icon: "✋" },
  { id: "poll", label: "🗳️ 투표", icon: "🗳️" },
  { id: "emoji", label: "😄 반응", icon: "😄" },
  { id: "qa", label: "💬 Q&A", icon: "💬" },
] as const;

export function CollaborationPanel({
  userId,
  userName,
  noteId,
  isEducator = false,
  className = "",
}: CollaborationPanelProps) {
  const { activeTab, setActiveTab } = useCollaborationStore();

  return (
    <div
      className={`flex flex-col w-full h-[380px] bg-[#2F2F2F] border-2 border-[#AFC02B] rounded-[10px] overflow-hidden transition-all duration-500 ease-out ${className}`}
      style={{
        animation: "expandPanel 0.5s ease-out forwards",
      }}
    >
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-[#444444]">
        <h3 className="text-white text-sm font-bold">협업</h3>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 px-3 py-2 border-b border-[#444444] flex-shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[#AFC02B] text-black"
                : "bg-[#3f3f3f] text-white hover:bg-[#4f4f4f]"
            }`}
            title={tab.label}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeTab === "hands" && (
          <HandRaisePanel
            userId={userId}
            userName={userName}
            noteId={noteId}
            isEducator={isEducator}
          />
        )}

        {activeTab === "poll" && (
          <PollPanel userId={userId} noteId={noteId} isEducator={isEducator} />
        )}

        {activeTab === "emoji" && (
          <EmojiReactionsPanel
            userId={userId}
            userName={userName}
            noteId={noteId}
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
      </div>
    </div>
  );
}

/**
 * 축약된 버전 (사이드바용)
 */
export function CollaborationPanelCompact({
  userId,
  userName,
  noteId,
  isEducator = false,
}: CollaborationPanelProps) {
  const { activeTab, setActiveTab, handRaises, currentPoll, questions } =
    useCollaborationStore();

  // 각 탭의 활성 항목 개수
  const badges = {
    hands: handRaises.length,
    poll: currentPoll?.isActive ? 1 : 0,
    qa: questions.length,
  };

  return (
    <div className="space-y-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`w-full py-2 px-3 rounded text-sm font-medium transition-all relative ${
            activeTab === tab.id
              ? "bg-[#AFC02B] text-black"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {tab.icon} {tab.label}

          {/* 배지 */}
          {badges[tab.id as keyof typeof badges] > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {badges[tab.id as keyof typeof badges]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
