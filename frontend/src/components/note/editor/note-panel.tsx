/**
 * 노트 패널 컴포넌트 (블록 기반 에디터)
 */

"use client";

import { KeyboardEvent, useRef, useEffect } from "react";
import type { NoteBlock } from "@/features/note";

interface NotePanelProps {
  isOpen: boolean;
  blocks: NoteBlock[];
  onAddBlock: (afterId: string, type?: NoteBlock["type"]) => string;
  onUpdateBlock: (id: string, updates: Partial<NoteBlock>) => void;
  onDeleteBlock: (id: string) => void;
}

export function NotePanel({
  isOpen,
  blocks,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
}: NotePanelProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, blockId: string, blockContent: string) => {
    // Enter: 새 블록 추가
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newBlockId = onAddBlock(blockId);
      // 다음 블록으로 포커스 이동
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-block-id="${newBlockId}"]`) as HTMLTextAreaElement;
        nextInput?.focus();
      }, 0);
    }

    // Backspace: 빈 블록 삭제
    if (e.key === "Backspace" && blockContent === "") {
      e.preventDefault();
      const currentIndex = blocks.findIndex((b) => b.id === blockId);
      if (currentIndex > 0) {
        onDeleteBlock(blockId);
        // 이전 블록으로 포커스 이동
        setTimeout(() => {
          const prevBlock = blocks[currentIndex - 1];
          const prevInput = document.querySelector(`[data-block-id="${prevBlock.id}"]`) as HTMLTextAreaElement;
          prevInput?.focus();
          prevInput?.setSelectionRange(prevInput.value.length, prevInput.value.length);
        }, 0);
      }
    }

    // Markdown shortcuts
    if (e.key === " " && blockContent.startsWith("#")) {
      e.preventDefault();
      const level = blockContent.split("#").length - 1;
      if (level >= 1 && level <= 3) {
        onUpdateBlock(blockId, {
          type: `heading${level}` as NoteBlock["type"],
          content: "",
        });
      }
    }

    if (e.key === " " && blockContent === "-") {
      e.preventDefault();
      onUpdateBlock(blockId, { type: "bullet", content: "" });
    }

    if (e.key === " " && blockContent === "1.") {
      e.preventDefault();
      onUpdateBlock(blockId, { type: "numbered", content: "" });
    }

    if (e.key === " " && blockContent === "```") {
      e.preventDefault();
      onUpdateBlock(blockId, { type: "code", content: "" });
    }
  };

  const getBlockStyle = (type: NoteBlock["type"]) => {
    switch (type) {
      case "heading1":
        return "text-2xl font-bold text-white";
      case "heading2":
        return "text-xl font-bold text-white";
      case "heading3":
        return "text-lg font-bold text-white";
      case "code":
        return "font-mono text-sm bg-[#1e1e1e] text-[#b9b9b9] p-2 rounded";
      default:
        return "text-sm text-white";
    }
  };

  const getPlaceholder = (type: NoteBlock["type"]) => {
    switch (type) {
      case "heading1":
        return "제목 1";
      case "heading2":
        return "제목 2";
      case "heading3":
        return "제목 3";
      case "bullet":
        return "항목";
      case "numbered":
        return "번호 항목";
      case "code":
        return "코드";
      default:
        return "입력하려면 '/'를 누르세요. Markdown을 지원합니다.";
    }
  };

  return (
    <div className="w-full h-full bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-6 flex flex-col">
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {blocks.map((block, index) => (
          <div key={block.id} className="flex items-start gap-2 group hover:bg-[#363636] rounded-lg px-2 py-1 transition-colors">
            {/* 블록 타입 인디케이터 */}
            <div className="flex-shrink-0 w-6 pt-1.5 text-[#666666] opacity-0 group-hover:opacity-100 transition-opacity">
              {block.type === "bullet" && (
                <span className="text-sm">•</span>
              )}
              {block.type === "numbered" && (
                <span className="text-sm">{index + 1}.</span>
              )}
              {block.type === "text" && (
                <span className="text-xs">+</span>
              )}
            </div>

            {/* 입력 영역 */}
            <textarea
              data-block-id={block.id}
              value={block.content}
              onChange={(e) => onUpdateBlock(block.id, { content: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, block.id, block.content)}
              placeholder={getPlaceholder(block.type)}
              className={`flex-1 bg-transparent border-none outline-none resize-none overflow-hidden ${getBlockStyle(block.type)} placeholder-[#555555]`}
              rows={1}
              style={{
                minHeight: "28px",
                height: "auto",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          </div>
        ))}
      </div>

      {/* 도움말 */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-[#444444]">
        <p className="text-[#555555] text-xs leading-relaxed">
          <span className="font-bold text-[#666666]">단축키:</span> Enter 새 블록 | Backspace 빈 블록 삭제
          <br />
          <span className="font-bold text-[#666666]">Markdown:</span> # 제목1 | ## 제목2 | ### 제목3 | - 글머리 | 1. 번호 | ``` 코드
        </p>
      </div>
    </div>
  );
}
