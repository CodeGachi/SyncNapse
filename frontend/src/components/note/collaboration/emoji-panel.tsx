/**
 * 이모지 반응 패널 컴포넌트
 * 실시간 이모지 반응 전송 기능 제공
 */

"use client";

import { Smile } from "lucide-react";
import { useEmojiReaction } from "./emoji-reactions";
import { AVAILABLE_EMOJIS, type AvailableEmoji } from "@/lib/types/collaboration";

interface EmojiPanelProps {
  userId: string;
  userName: string;
  noteId: string;
}

export function EmojiPanel({ userId, userName, noteId }: EmojiPanelProps) {
  const { sendEmoji } = useEmojiReaction(noteId, userId, userName);

  // 이모지 클릭 핸들러
  const handleEmojiClick = (emoji: AvailableEmoji) => {
    sendEmoji(emoji);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8">
      {/* 헤더 섹션 */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smile size={32} className="text-brand" />
        </div>
        <h4 className="text-foreground text-lg font-bold">이모지 반응 보내기</h4>
        <p className="text-foreground-secondary text-sm max-w-[200px] mx-auto leading-relaxed">
          클릭하여 모든 참여자에게<br />실시간 반응을 보내보세요
        </p>
      </div>

      {/* 이모지 그리드 */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-background-surface rounded-2xl border border-border">
        {AVAILABLE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="w-14 h-14 flex items-center justify-center text-3xl bg-background-elevated hover:bg-background-overlay rounded-xl transition-all hover:scale-110 active:scale-95 border border-transparent hover:border-brand/50 shadow-lg"
            title={`${emoji} 반응 보내기`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
