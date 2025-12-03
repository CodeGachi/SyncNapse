/**
 * Decode filename from Latin-1 to UTF-8
 * Multer encodes non-ASCII filenames as Latin-1, so we need to decode them properly
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
