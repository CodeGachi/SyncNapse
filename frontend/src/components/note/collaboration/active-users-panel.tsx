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
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#AFC02B]" />
          <h4 className="text-white text-sm font-bold">
            접속자 ({allUsers.length}명)
          </h4>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="space-y-2">
        {allUsers.length === 0 ? (
          <p className="text-gray-400 text-xs text-center py-4">
            접속자가 없습니다
          </p>
        ) : (
          allUsers.map((user) => (
            <div
              key={user.connectionId}
              className="flex items-center gap-3 p-2 bg-[#3C3C3C] rounded-lg hover:bg-[#4A4A4A] transition-colors"
            >
              {/* 아바타 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: user.color }}
              >
                {user.userName.charAt(0).toUpperCase()}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium truncate">
                    {user.userName}
                    {user.isSelf && (
                      <span className="text-[#AFC02B] text-xs ml-1">(나)</span>
                    )}
                  </p>
                  {/* 온라인 상태 */}
                  <Circle
                    size={8}
                    className="text-green-400 fill-green-400 flex-shrink-0"
                  />
                </div>
                <p className="text-gray-400 text-xs">
                  ID: {String(user.connectionId).slice(0, 8)}...
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
