/**
 * 노트 텍스트 추출 유틸리티
 * BlockNote 에디터의 blocks 데이터에서 텍스트를 추출합니다.
 */

/**
 * BlockNote의 단일 Block에서 텍스트를 추출합니다.
 * @param block - BlockNote Block 객체
 * @returns 추출된 텍스트
 */
function extractTextFromBlock(block: any): string {
  let text = '';

  // content가 배열인 경우 (inline content)
  if (Array.isArray(block.content)) {
    text = block.content
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        if (item.type === 'text' && item.text) return item.text;
        return '';
      })
      .join('');
  }
  // content가 문자열인 경우
  else if (typeof block.content === 'string') {
    text = block.content;
  }
  // props.text가 있는 경우 (일부 BlockNote 버전)
  else if (block.props?.text) {
    text = block.props.text;
  }

  // children이 있는 경우 재귀적으로 처리
  if (block.children && Array.isArray(block.children)) {
    const childrenText = block.children
      .map((child: any) => extractTextFromBlock(child))
      .join('\n');

    if (childrenText) {
      text += '\n' + childrenText;
    }
  }

  return text;
}

/**
 * BlockNote blocks 배열에서 모든 텍스트를 추출합니다.
 * @param blocks - BlockNote blocks 배열
 * @returns 추출된 텍스트 (블록별로 줄바꿈 구분)
 */
export function extractTextFromBlocks(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return '';
  }

  const textLines = blocks
    .map((block) => extractTextFromBlock(block))
    .filter((text) => text.trim().length > 0);

  return textLines.join('\n');
}

/**
 * 여러 페이지의 blocks에서 텍스트를 추출합니다.
 * @param pagesBlocks - 페이지별 blocks 맵 { pageId: blocks[] }
 * @returns 모든 페이지의 텍스트 (페이지별로 구분됨)
 */
export function extractTextFromMultiplePages(
  pagesBlocks: Record<string, any[]>
): string {
  const pageTexts = Object.entries(pagesBlocks)
    .map(([pageId, blocks]) => {
      const text = extractTextFromBlocks(blocks);
      if (text.trim()) {
        return `[페이지 ${pageId}]\n${text}`;
      }
      return '';
    })
    .filter((text) => text.length > 0);

  return pageTexts.join('\n\n');
}

/**
 * HTML 태그를 제거하고 순수 텍스트만 추출합니다.
 * @param html - HTML 문자열
 * @returns 순수 텍스트
 */
export function stripHtmlTags(html: string): string {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 간단한 정규식 사용
    return html.replace(/<[^>]*>/g, '');
  }

  // 클라이언트 사이드에서는 DOM 사용
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
