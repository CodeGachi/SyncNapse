/**
 * URL Shortener Utility
 * Creates short URLs from note IDs using a simple encoding
 * 
 * Approach: Use the first 8 characters of the CUID noteId as the short code
 * This is unique enough and can be easily reversed by searching notes
 */

/**
 * Create a short code from a noteId
 * Uses the first 8 characters of the CUID for uniqueness
 */
export function createShortCode(noteId: string): string {
  if (!noteId) return '';
  // CUID format: starts with 'c' followed by alphanumeric chars
  // Take first 8 chars (enough for uniqueness, 36^8 = 2.8 trillion combinations)
  return noteId.substring(0, 8);
}

/**
 * Extract the short code prefix to use for note lookup
 * This can be used to search for notes with IDs starting with this prefix
 */
export function extractShortCodePrefix(shortCode: string): string {
  return shortCode.substring(0, 8);
}

/**
 * Generate a short share link for a note
 * Format: /s/{shortCode}
 */
export function generateShortShareLink(noteId: string): string {
  if (typeof window === "undefined") return "";
  const shortCode = createShortCode(noteId);
  return `${window.location.origin}/s/${shortCode}`;
}

/**
 * Generate a short collaborative link for a note
 * Format: /c/{shortCode}
 */
export function generateShortCollaborativeLink(noteId: string): string {
  if (typeof window === "undefined") return "";
  const shortCode = createShortCode(noteId);
  return `${window.location.origin}/c/${shortCode}`;
}

/**
 * Check if a URL is a short link
 */
export function isShortLink(url: string): boolean {
  const shortPatterns = ['/s/', '/c/'];
  return shortPatterns.some(pattern => url.includes(pattern));
}

