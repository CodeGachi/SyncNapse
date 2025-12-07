/**
 * Note Block Type Definitions
 * 텍스트 필기 블록 타입 정의
 */

export interface NoteBlock {
  id: string;
  type:
    | "text"
    | "heading1"
    | "heading2"
    | "heading3"
    | "bullet"
    | "numbered"
    | "code"
    | "strikethrough"
    | "checkbox"
    | "toggle"
    | "divider"
    | "quote";
  content: string;
  checked?: boolean; // checkbox type
  expanded?: boolean; // toggle type
  indent?: number; // indentation level (0~5)
  linkedTranscriptSegmentId?: string; // linked transcript segment ID
  linkedTimestamp?: number; // linked transcript timestamp (seconds)

  // 🆕 Audio recording link (for typing-audio sync)
  audioLink?: {
    recordingId: string;      // Recording's ID (from DB)
    recordingTitle?: string;  // Recording title (for UI display)
    startTime: number;        // Block creation start time (seconds from recording start)
    endTime?: number;         // Block creation end time (optional)
  };
}
