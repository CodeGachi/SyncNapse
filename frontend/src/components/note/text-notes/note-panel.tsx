/**
 * Note panel component (BlockNote-based editor)
 * Per-page note functionality for PDF
 */

"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useNoteEditorStore } from "@/stores";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface NotePanelProps {
  isOpen: boolean;
  noteId?: string | null;
}

export function NotePanel({ isOpen, noteId }: NotePanelProps) {
  const {
    getCurrentPageBlocks,
    updatePageBlocksFromBlockNote,
    currentPage,
    selectedFileId,
  } = useNoteEditorStore();

  // 페이지별 블록 데이터를 BlockNote 형식으로 변환
  const blocknoteContent = useMemo(() => {
    const blocks = getCurrentPageBlocks();
    if (!blocks || blocks.length === 0) {
      return [
        {
          type: "paragraph",
          content: "",
        },
      ] as PartialBlock[];
    }

    // 기존 NoteBlock을 BlockNote 형식으로 변환
    return blocks.map((block) => {
      const blockType = mapTypeToBlockNote(block.type);

      // 체크박스 타입 처리
      if (block.type === "checkbox") {
        return {
          type: "checkListItem" as const,
          content: block.content || "",
          props: {
            checked: block.checked || false,
          },
        } as PartialBlock;
      }

      // 제목 타입 처리 (level 추가)
      if (block.type === "heading1" || block.type === "heading2" || block.type === "heading3") {
        const level = block.type === "heading1" ? 1 : block.type === "heading2" ? 2 : 3;
        return {
          type: "heading" as const,
          content: block.content || "",
          props: {
            level,
          },
        } as PartialBlock;
      }

      return {
        type: blockType as any,
        content: block.content || "",
      } as PartialBlock;
    }) as PartialBlock[];
  }, [getCurrentPageBlocks, selectedFileId, currentPage]);

  // BlockNote 에디터 생성
  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: blocknoteContent,
  });

  // 에디터 콘텐츠 업데이트
  useEffect(() => {
    if (editor && blocknoteContent) {
      editor.replaceBlocks(editor.document, blocknoteContent);
    }
  }, [selectedFileId, currentPage]);

  // 에디터 변경사항을 store에 반영
  const handleChange = () => {
    if (!editor) return;

    const blocks = editor.document;
    updatePageBlocksFromBlockNote(blocks);
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl p-3 flex flex-col">
      {/* Page info header */}
      <div className="flex-shrink-0 mb-2 pb-1 border-b border-[#444444] flex items-center gap-2">
        <h3 className="text-white text-xs">P{currentPage}</h3>

        {/* Help icon */}
        <div className="relative group">
          <button className="w-4 h-4 rounded-full bg-[#444444] hover:bg-[#555555] flex items-center justify-center transition-colors">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#b9b9b9" strokeWidth="1" />
              <path d="M6 8.5V8M6 4.5a1 1 0 011 1" stroke="#b9b9b9" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>

          {/* Tooltip displayed on hover */}
          <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-[420px] bg-[#2a2a2a] border border-[#444444] rounded-lg p-3 shadow-xl">
            <p className="text-[#b9b9b9] text-xs leading-relaxed mb-2">
              <span className="font-bold text-[#888888]">단축키:</span> / 슬래시 메뉴 | Ctrl+B 굵게 | Ctrl+I 기울임 | Ctrl+U 밑줄
            </p>
            <p className="text-[#b9b9b9] text-xs leading-relaxed mb-1">
              <span className="font-bold text-[#888888]">제목:</span> # 제목1 | ## 제목2 | ### 제목3
            </p>
            <p className="text-[#b9b9b9] text-xs leading-relaxed mb-1">
              <span className="font-bold text-[#888888]">리스트:</span> - 글머리 | 1. 번호 | [] 체크박스
            </p>
            <p className="text-[#b9b9b9] text-xs leading-relaxed">
              <span className="font-bold text-[#888888]">기타:</span> ``` 코드 | &gt; 인용 | --- 구분선
            </p>
          </div>
        </div>
      </div>

      {/* BlockNote Editor */}
      <div className="flex-1 overflow-y-auto blocknote-container">
        {editor && (
          <BlockNoteView
            editor={editor}
            theme="dark"
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 기존 NoteBlock 타입을 BlockNote 타입으로 매핑
 */
function mapTypeToBlockNote(type: string): string {
  const typeMap: Record<string, string> = {
    text: "paragraph",
    heading1: "heading",
    heading2: "heading",
    heading3: "heading",
    bullet: "bulletListItem",
    numbered: "numberedListItem",
    code: "code",
    checkbox: "checkListItem",
    quote: "paragraph", // BlockNote에는 quote가 없으므로 paragraph로
    divider: "paragraph",
    strikethrough: "paragraph",
    toggle: "paragraph",
  };

  return typeMap[type] || "paragraph";
}
