/**
 * Educator 헤더 컨텐츠 (Liveblocks Provider 내부용)
 *
 * useOthers 훅을 사용하여 접속자 정보를 표시
 */

"use client";

import { useOthers } from "@/lib/liveblocks/liveblocks.config";

interface EducatorHeaderContentProps {
  totalUsers: number;
}

export function EducatorHeaderContent() {
  const others = useOthers();
  const totalUsers = others.length + 1;

  return (
    <div className="bg-[#2F2F2F] px-4 py-2 rounded-lg shadow-lg border border-[#3C3C3C]">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {others.slice(0, 3).map((user) => (
            <div
              key={user.connectionId}
              className="w-8 h-8 rounded-full border-2 border-[#2F2F2F] flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: user.presence.color }}
              title={user.presence.userName}
            >
              {user.presence.userName.charAt(0).toUpperCase()}
            </div>
          ))}
          {others.length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-[#2F2F2F] bg-[#4A4A4A] flex items-center justify-center text-xs font-bold text-white">
              +{others.length - 3}
            </div>
          )}
        </div>
        <span className="text-white text-sm font-medium">
          {totalUsers}명 접속 중
        </span>
      </div>
    </div>
  );
}
