/**
 * PDF 텍스트 추출 유틸리티
 * PDF.js를 사용하여 PDF 파일에서 텍스트를 추출합니다.
 */

/**
 * PDF 파일에서 모든 페이지의 텍스트를 추출합니다.
 * @param pdfUrl - PDF 파일의 URL (blob URL 또는 http URL)
 * @returns 추출된 텍스트 (페이지별로 구분됨)
 */
export async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  try {
    // PDF.js 라이브러리 로드 확인
    if (typeof window === 'undefined' || !(window as any).pdfjsLib) {
      throw new Error('PDF.js 라이브러리가 로드되지 않았습니다.');
    }

    const pdfjsLib = (window as any).pdfjsLib;

    // PDF 문서 로드
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;

    const textPages: string[] = [];

    // 각 페이지에서 텍스트 추출
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 텍스트 아이템들을 하나의 문자열로 결합
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      textPages.push(`[페이지 ${pageNum}]\n${pageText}`);
    }

    return textPages.join('\n\n');
  } catch (error) {
    console.error('[PDF 텍스트 추출 실패]', error);
    throw new Error('PDF에서 텍스트를 추출할 수 없습니다.');
  }
}

/**
 * 여러 PDF 파일에서 텍스트를 추출합니다.
 * @param pdfUrls - PDF 파일 URL 배열
 * @returns 모든 PDF의 텍스트 (파일별로 구분됨)
 */
export async function extractTextFromMultiplePdfs(
  pdfUrls: string[]
): Promise<string> {
  const results = await Promise.allSettled(
    pdfUrls.map((url) => extractTextFromPdf(url))
  );

  const successfulExtractions = results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return `=== PDF 파일 ${index + 1} ===\n${result.value}`;
      } else {
        console.warn(`PDF ${index + 1} 추출 실패:`, result.reason);
        return `=== PDF 파일 ${index + 1} ===\n[텍스트 추출 실패]`;
      }
    })
    .filter(Boolean);

  return successfulExtractions.join('\n\n');
}
