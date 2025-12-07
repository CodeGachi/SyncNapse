/**
 * Type Definitions Barrel Export
 * @example
 * import { Folder, Note, UploadedFile } from "@/lib/types";
 */

// Domain Types
export * from "./domain";

// File Types
export * from "./file";

// Recording & Translation Types
export * from "./recording";

// Question Types
export * from "./question";

// Note Types
export * from "./note";

// Collaboration Types (Question/Answer excluded to avoid conflict with ./question)
export type {
  HandRaise,
  PollOption,
  Poll,
  EmojiReaction,
  AvailableEmoji,
  CollaborationPanelState,
} from "./collaboration";
export { AVAILABLE_EMOJIS } from "./collaboration";

// Drawing Types
export * from "./drawing";
