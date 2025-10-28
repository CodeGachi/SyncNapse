/**
 * 개별 노트 블록 컴포넌트
 */

"use client";

import { KeyboardEvent } from "react";
import type { NoteBlock } from "@/features/note";
import { getBlockStyle, getPlaceholder } from "@/features/note/editor/note-block-styles";

interface NoteBlockProps {
  block: NoteBlock;
  blockIndex: number;
  visibleIndex: number;
  indent: number;
  onUpdate: (blockId: string, updates: Partial<NoteBlock>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, blockId: string, content: string) => void;
}

export function NoteBlockComponent({
  block,
  blockIndex,
  visibleIndex,
  indent,
  onUpdate,
  onKeyDown,
}: NoteBlockProps) {
  const indentStyle = { marginLeft: `${indent * 24}px` };

  return (
    <div
      key={block.id}
      className="flex items-start gap-2 group hover:bg-[#363636] rounded-lg px-2 py-0.5 transition-colors"
      style={indentStyle}
    >
      {/* 라인 넘버 */}
      <div className="flex-shrink-0 w-8 pt-0.5 text-[#666666] text-xs font-mono text-right select-none">
        {blockIndex + 1}
      </div>

      {/* 블록 타입 인디케이터 */}
      <div className="flex-shrink-0 w-6 pt-0.5 text-[#666666] transition-opacity">
        {block.type === "bullet" && <span className="text-sm">•</span>}
        {block.type === "numbered" && <span className="text-sm">{visibleIndex + 1}.</span>}
        {block.type === "checkbox" && (
          <input
            type="checkbox"
            checked={block.checked || false}
            onChange={(e) => {
              e.stopPropagation();
              onUpdate(block.id, { checked: e.target.checked });
            }}
            className="w-4 h-4 cursor-pointer"
          />
        )}
        {block.type === "toggle" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(block.id, { expanded: !block.expanded });
            }}
            className="text-sm cursor-pointer hover:text-white transition-colors"
          >
            {block.expanded ? "▼" : "▶"}
          </button>
        )}
        {block.type === "text" && <span className="text-xs">+</span>}
      </div>

      {/* 입력 영역 */}
      {block.type === "divider" ? (
        <div className="flex-1 flex items-center py-2">
          <hr className="flex-1 border-t-2 border-[#666666]" />
        </div>
      ) : block.type === "toggle" && !block.expanded ? (
        <div className="flex-1 text-sm text-[#666666] py-0.5">
          {block.content || getPlaceholder(block.type)}
        </div>
      ) : (
        <textarea
          data-block-id={block.id}
          value={block.content}
          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
          onKeyDown={(e) => onKeyDown(e, block.id, block.content)}
          placeholder={getPlaceholder(block.type)}
          className={`flex-1 bg-transparent border-none outline-none resize-none overflow-hidden ${getBlockStyle(block.type)} placeholder-[#555555]`}
          rows={1}
          style={{
            minHeight: "20px",
            height: "auto",
            lineHeight: "1.4",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = target.scrollHeight + "px";
          }}
        />
      )}
    </div>
  );
}
