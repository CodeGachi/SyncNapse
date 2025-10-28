/**
 * 노트 에디터 키보드 이벤트 처리 훅
 */

import { KeyboardEvent } from "react";
import type { NoteBlock } from "./use-note-panel";

interface KeyboardHandlerProps {
  blocks: NoteBlock[];
  blockId: string;
  blockContent: string;
  addPageBlock: (afterBlockId: string) => string;
  updatePageBlock: (blockId: string, updates: Partial<NoteBlock>) => void;
  deletePageBlock: (blockId: string) => void;
}

/**
 * 키보드 이벤트 핸들러 생성
 */
export function createKeyboardHandler({
  blocks,
  blockId,
  blockContent,
  addPageBlock,
  updatePageBlock,
  deletePageBlock,
}: KeyboardHandlerProps) {
  return (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab: 들여쓰기
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const currentBlock = blocks.find((b) => b.id === blockId);
      const currentIndent = currentBlock?.indent || 0;
      if (currentIndent < 5) {
        updatePageBlock(blockId, { indent: currentIndent + 1 });
      }
      return;
    }

    // Shift+Tab: 내어쓰기
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const currentBlock = blocks.find((b) => b.id === blockId);
      const currentIndent = currentBlock?.indent || 0;
      if (currentIndent > 0) {
        updatePageBlock(blockId, { indent: currentIndent - 1 });
      }
      return;
    }

    // Enter: 새 블록 추가
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const newBlockId = addPageBlock(blockId);
      // 다음 블록으로 포커스 이동
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-block-id="${newBlockId}"]`) as HTMLTextAreaElement;
        nextInput?.focus();
      }, 0);
      return;
    }

    // Backspace: 빈 블록 삭제 또는 내어쓰기
    if (e.key === "Backspace" && blockContent === "") {
      e.preventDefault();
      const currentBlock = blocks.find((b) => b.id === blockId);
      const currentIndent = currentBlock?.indent || 0;

      // 들여쓰기가 있으면 먼저 내어쓰기
      if (currentIndent > 0) {
        updatePageBlock(blockId, { indent: currentIndent - 1 });
        return;
      }

      // 들여쓰기가 없으면 블록 삭제
      const currentIndex = blocks.findIndex((b) => b.id === blockId);
      if (currentIndex > 0) {
        deletePageBlock(blockId);
        // 이전 블록으로 포커스 이동
        setTimeout(() => {
          const prevBlock = blocks[currentIndex - 1];
          const prevInput = document.querySelector(`[data-block-id="${prevBlock.id}"]`) as HTMLTextAreaElement;
          prevInput?.focus();
          prevInput?.setSelectionRange(prevInput.value.length, prevInput.value.length);
        }, 0);
      }
      return;
    }

    // Cmd/Ctrl + Shift + S: 취소선
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      const currentBlock = blocks.find((b) => b.id === blockId);
      if (currentBlock?.type === "strikethrough") {
        updatePageBlock(blockId, { type: "text" });
      } else {
        updatePageBlock(blockId, { type: "strikethrough" });
      }
      return;
    }

    // Markdown shortcuts (Space로 트리거)
    if (e.key === " ") {
      e.preventDefault();

      // # : 제목1
      if (blockContent === "#") {
        updatePageBlock(blockId, { type: "heading1", content: "" });
        return;
      }

      // ## : 제목2
      if (blockContent === "##") {
        updatePageBlock(blockId, { type: "heading2", content: "" });
        return;
      }

      // ### : 제목3
      if (blockContent === "###") {
        updatePageBlock(blockId, { type: "heading3", content: "" });
        return;
      }

      // - : 순서 없는 리스트
      if (blockContent === "-") {
        updatePageBlock(blockId, { type: "bullet", content: "" });
        return;
      }

      // 1. , a. , i. : 순서 있는 리스트
      if (blockContent.match(/^(1\.|a\.|i\.)$/)) {
        updatePageBlock(blockId, { type: "numbered", content: "" });
        return;
      }

      // [] : 체크박스
      if (blockContent === "[]") {
        updatePageBlock(blockId, { type: "checkbox", content: "", checked: false });
        return;
      }

      // > : 토글
      if (blockContent === ">") {
        updatePageBlock(blockId, { type: "toggle", content: "", expanded: true });
        return;
      }

      // --- : 구분선
      if (blockContent === "---") {
        updatePageBlock(blockId, { type: "divider", content: "" });
        return;
      }

      // ``` : 코드 블럭
      if (blockContent === "```") {
        updatePageBlock(blockId, { type: "code", content: "" });
        return;
      }

      // " : 인용
      if (blockContent === '"') {
        updatePageBlock(blockId, { type: "quote", content: "" });
        return;
      }

      // 매칭되지 않으면 공백 입력
      updatePageBlock(blockId, { content: blockContent + " " });
    }
  };
}
