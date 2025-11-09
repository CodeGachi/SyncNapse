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
import { Users, MessageCircle, BarChart3 } from "lucide-react";

interface CollaborationPanelProps {
  userId: string;
  userName: string;
  noteId: string;
  isEducator?: boolean;
  className?: string;
}

type TabId = "users" | "qa" | "poll";

const TABS = [
  { id: "users" as const, label: "접속자", icon: Users },
  { id: "qa" as const, label: "Q&A", icon: MessageCircle },
  { id: "poll" as const, label: "투표", icon: BarChart3 },
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
      </div>
    </div>
  );
}
