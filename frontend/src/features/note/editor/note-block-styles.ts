/**
 * 노트 블록 스타일 및 플레이스홀더 유틸리티
 */

import type { NoteBlock } from "./use-note-panel";

/**
 * 블록 타입에 따른 CSS 클래스 반환
 */
export function getBlockStyle(type: NoteBlock["type"]): string {
  switch (type) {
    case "heading1":
      return "text-2xl font-bold text-white";
    case "heading2":
      return "text-xl font-bold text-white";
    case "heading3":
      return "text-lg font-bold text-white";
    case "code":
      return "font-mono text-sm bg-[#1e1e1e] text-[#b9b9b9] p-2 rounded";
    case "strikethrough":
      return "text-sm text-white line-through";
    case "checkbox":
      return "text-sm text-white";
    case "toggle":
      return "text-sm text-white";
    case "divider":
      return "text-sm text-[#666666]";
    case "quote":
      return "text-sm text-white italic border-l-4 border-[#666666] pl-3";
    default:
      return "text-sm text-white";
  }
}

/**
 * 블록 타입에 따른 플레이스홀더 텍스트 반환
 */
export function getPlaceholder(type: NoteBlock["type"]): string {
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
    case "strikethrough":
      return "취소선 텍스트";
    case "checkbox":
      return "할 일";
    case "toggle":
      return "토글 내용";
    case "divider":
      return "구분선";
    case "quote":
      return "인용문";
    default:
      return "입력하려면 '/'를 누르세요. Markdown을 지원합니다.";
  }
}
