/**
 * 토글 블록 가시성 관리 훅
 */

import type { NoteBlock } from "./use-note-panel";

/**
 * 토글 상태에 따라 표시할 블록 필터링 (노션 스타일)
 *
 * @param blocks 전체 블록 배열
 * @returns 표시할 블록들만 필터링한 배열
 */
export function getVisibleBlocks(blocks: NoteBlock[]): NoteBlock[] {
  const visibleBlocks: NoteBlock[] = [];
  let skipUntilIndent: number | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const indent = block.indent || 0;

    // 숨김 모드 중일 때
    if (skipUntilIndent !== null) {
      // 현재 블록의 indent가 skipUntilIndent보다 작거나 같으면 숨김 모드 종료
      if (indent <= skipUntilIndent) {
        skipUntilIndent = null;
        // 이 블록은 표시
        visibleBlocks.push(block);

        // 이 블록이 닫힌 토글이면 다시 숨김 모드 시작
        if (block.type === "toggle" && !block.expanded) {
          skipUntilIndent = indent;
        }
      }
      // 아니면 이 블록은 숨김 (continue)
    } else {
      // 숨김 모드가 아니면 블록 표시
      visibleBlocks.push(block);

      // 이 블록이 닫힌 토글이면 숨김 모드 시작
      if (block.type === "toggle" && !block.expanded) {
        skipUntilIndent = indent;
      }
    }
  }

  return visibleBlocks;
}
