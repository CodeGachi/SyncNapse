/**
 * Date formatting utilities
 * Date formatting related utility functions
 */

/**
 * Convert timestamp to relative time (Korean)
 * @param timestamp - Timestamp in milliseconds
 * @returns Relative time string (e.g., "오늘", "어제", "3일 전")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR");
}

/**
 * Convert timestamp to relative time (English)
 * @param timestamp - Timestamp in milliseconds
 * @returns Relative time string (e.g., "Today", "Yesterday", "3 days ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
