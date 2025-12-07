/**
 * 파일명 디코딩 유틸리티
 * Multer가 non-ASCII 파일명을 Latin-1로 인코딩하므로 UTF-8로 디코딩 필요
 */

/**
 * Latin-1로 인코딩된 파일명을 UTF-8로 디코딩
 * @param filename - 디코딩할 파일명
 * @returns 디코딩된 파일명
 */
export function decodeFilename(filename: string): string {
  try {
    // Convert each character to its byte value (Latin-1 to bytes)
    const bytes = new Uint8Array(filename.length);
    for (let i = 0; i < filename.length; i++) {
      bytes[i] = filename.charCodeAt(i);
    }
    // Decode bytes as UTF-8
    const decoder = new TextDecoder("utf-8");
    const decoded = decoder.decode(bytes);
    // Check if decoding was successful (no replacement characters)
    if (decoded && !decoded.includes("\ufffd")) {
      return decoded;
    }
    return filename;
  } catch {
    return filename;
  }
}
