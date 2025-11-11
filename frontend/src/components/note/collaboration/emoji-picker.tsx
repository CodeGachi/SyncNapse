/**
 * 이모지 선택 버튼
 *
 * 사용자가 실시간 이모지 반응을 보낼 수 있는 플로팅 버튼
 * - 6가지 이모지 지원: 👍, ❤️, 😂, 🔥, 😮, 😢
 * - 클릭 시 Liveblocks Broadcast로 전송
 */

"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { AVAILABLE_EMOJIS, type AvailableEmoji } from "@/lib/types/collaboration";
import { useEmojiReaction } from "./emoji-reactions";

interface EmojiPickerProps {
  noteId: string;
  userId: string;
  userName: string;
  className?: string;
}

export function EmojiPicker({
  noteId,
  userId,
  userName,
  className = "",
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { sendEmoji } = useEmojiReaction(noteId, userId, userName);

  const handleEmojiClick = (emoji: AvailableEmoji) => {
    sendEmoji(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 메인 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#AFC02B] text-black rounded-lg font-medium hover:bg-[#AFC02B]/90 transition-all shadow-lg"
        title="이모지 반응 보내기"
      >
        <Smile size={20} />
        <span className="hidden sm:inline">반응</span>
      </button>

      {/* 이모지 선택 팝업 */}
      {isOpen && (
        <>
          {/* 배경 클릭 영역 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 이모지 그리드 */}
          <div className="absolute bottom-full mb-2 right-0 bg-[#2F2F2F] border-2 border-[#AFC02B] rounded-lg shadow-xl z-50 p-2 grid grid-cols-3 gap-2 animate-scale-in">
            {AVAILABLE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-12 h-12 flex items-center justify-center text-2xl hover:bg-[#AFC02B]/20 rounded transition-colors"
                title={`${emoji} 반응 보내기`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
