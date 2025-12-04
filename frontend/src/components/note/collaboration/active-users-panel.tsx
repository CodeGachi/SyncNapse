/**
 * 활성 사용자 패널
 *
 * Liveblocks useOthers를 사용하여 실시간 접속자 목록 표시
 */

"use client";

import { useOthers, useSelf } from "@/lib/liveblocks/liveblocks.config";
import { Users, Circle } from "lucide-react";

export function ActiveUsersPanel() {
  const others = useOthers();
  const self = useSelf();

  const allUsers = [
    ...(self
      ? [
        {
          connectionId: self.connectionId,
          ...self.presence,
          isSelf: true,
        },
      ]
      : []),
    ...others.map((user) => ({
      connectionId: user.connectionId,
      ...user.presence,
      isSelf: false,
    })),
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand/10 rounded-lg">
            <Users size={18} className="text-brand" />
          </div>
          <div>
            <h4 className="text-foreground text-sm font-bold">접속자 목록</h4>
            <p className="text-foreground-tertiary text-xs">현재 {allUsers.length}명이 함께하고 있습니다</p>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {allUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-foreground-tertiary gap-2">
            <Users size={24} className="opacity-20" />
            <p className="text-sm">접속자가 없습니다</p>
          </div>
        ) : (
          allUsers.map((user) => (
            <div
              key={user.connectionId}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${user.isSelf
                  ? "bg-brand/5 border-brand/20"
                  : "bg-background-surface border-transparent hover:bg-background-elevated"
                }`}
            >
              {/* 아바타 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm ring-2 ring-background-base"
                style={{ backgroundColor: user.color }}
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium truncate ${user.isSelf ? "text-brand" : "text-foreground"}`}>
                    {user.userName}
                    {user.isSelf && <span className="text-xs font-normal ml-1.5 opacity-80">(나)</span>}
                  </p>
                  {/* 온라인 상태 */}
                  <div className="flex items-center gap-1.5 bg-background-base px-2 py-0.5 rounded-full border border-border">
                    <Circle size={6} className="text-status-success fill-status-success animate-pulse" />
                    <span className="text-[10px] text-foreground-secondary font-medium">Online</span>
                  </div>
                </div>
                <p className="text-foreground-tertiary text-[10px] mt-0.5 font-mono">
                  ID: {String(user.connectionId).slice(0, 8)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
