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
import { EmojiPanel } from "./emoji-panel";
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
        <div className="flex items-center px-4 pt-2 border-b border-border-strong flex-shrink-0 bg-background-surface">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 relative group transition-all ${isActive ? "text-brand" : "text-foreground-secondary hover:text-foreground"
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-brand/10" : "group-hover:bg-foreground/5"
                  }`}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[11px] font-medium ${isActive ? "text-brand" : "text-foreground-tertiary group-hover:text-foreground-secondary"}`}>
                  {tab.label}
                </span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand rounded-t-full mx-4" />
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
