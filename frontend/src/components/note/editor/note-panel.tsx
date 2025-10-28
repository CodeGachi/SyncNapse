/**
 * 노트 패널 컴포넌트 (블록 기반 에디터)
 * PDF 페이지별 노트 기능
 */

"use client";

import { useNoteEditorStore } from "@/stores";
import { getVisibleBlocks } from "@/features/note/editor/use-toggle-visibility";
import { createKeyboardHandler } from "@/features/note/editor/use-note-keyboard";
import { NoteBlockComponent } from "./note-block";

interface NotePanelProps {
  isOpen: boolean;
}

export function NotePanel({ isOpen }: NotePanelProps) {
  const {
    getCurrentPageBlocks,
    addPageBlock,
    updatePageBlock,
    deletePageBlock,
    currentPage,
  } = useNoteEditorStore();

  if (!isOpen) return null;

  const blocks = getCurrentPageBlocks();
  const visibleBlocks = getVisibleBlocks(blocks);

  return (
    <div className="w-full h-full bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-3 flex flex-col">
      {/* 페이지 정보 헤더 */}
      <div className="flex-shrink-0 mb-2 pb-1 border-b border-[#444444] flex items-center gap-2">
        <h3 className="text-white text-xs">P{currentPage}</h3>

        {/* 도움말 아이콘 */}
        <div className="relative group">
          <button className="w-4 h-4 rounded-full bg-[#444444] hover:bg-[#555555] flex items-center justify-center transition-colors">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#b9b9b9" strokeWidth="1" />
              <path d="M6 8.5V8M6 4.5a1 1 0 011 1" stroke="#b9b9b9" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>

          {/* 호버 시 표시되는 툴팁 */}
          <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-[420px] bg-[#2a2a2a] border border-[#444444] rounded-lg p-3 shadow-xl">
            <p className="text-[#b9b9b9] text-xs leading-relaxed mb-2">
              <span className="font-bold text-[#888888]">단축키:</span> Enter 새 블록 | Backspace 빈 블록 삭제 | Tab 들여쓰기 | Shift+Tab 내어쓰기 | Cmd/Ctrl+Shift+S 취소선
            </p>
            <p className="text-[#b9b9b9] text-xs leading-relaxed mb-1">
              <span className="font-bold text-[#888888]">제목:</span> # 제목1 | ## 제목2 | ### 제목3
            </p>
            <p className="text-[#b9b9b9] text-xs leading-relaxed mb-1">
              <span className="font-bold text-[#888888]">리스트:</span> - 글머리 | 1. , a. , i. 번호 | [] 체크박스
            </p>
            <p className="text-[#b9b9b9] text-xs leading-relaxed">
              <span className="font-bold text-[#888888]">기타:</span> ``` 코드 | " 인용 | &gt; 토글 | --- 구분선
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-0 overflow-y-auto">
        {visibleBlocks.map((block, index) => {
          const blockIndex = blocks.findIndex((b) => b.id === block.id);
          const indent = block.indent || 0;

          return (
            <NoteBlockComponent
              key={block.id}
              block={block}
              blockIndex={blockIndex}
              visibleIndex={index}
              indent={indent}
              onUpdate={updatePageBlock}
              onKeyDown={(e, blockId, content) => {
                const handler = createKeyboardHandler({
                  blocks,
                  blockId,
                  blockContent: content,
                  addPageBlock,
                  updatePageBlock,
                  deletePageBlock,
                });
                handler(e);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
