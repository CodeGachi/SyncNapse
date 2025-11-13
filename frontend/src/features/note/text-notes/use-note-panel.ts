/**
 * 노트 패널 상태 관리 훅
 */

import { useState } from "react";

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

export function useNotePanel() {
  const [isNotePanelOpen, setIsNotePanelOpen] = useState(false);
  const [blocks, setBlocks] = useState<NoteBlock[]>([
    {
      id: "1",
      type: "text",
      content: "",
    },
  ]);

  const toggleNotePanel = () => {
    setIsNotePanelOpen((prev) => !prev);
  };

  const addBlock = (afterId: string, type: NoteBlock["type"] = "text") => {
    const index = blocks.findIndex((b) => b.id === afterId);
    const newBlock: NoteBlock = {
      id: Date.now().toString(),
      type,
      content: "",
    };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    setBlocks(newBlocks);
    return newBlock.id;
  };

  const updateBlock = (id: string, updates: Partial<NoteBlock>) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      )
    );
  };

  const deleteBlock = (id: string) => {
    if (blocks.length === 1) return; // 최소 1개 블록 유지
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  return {
    isNotePanelOpen,
    toggleNotePanel,
    blocks,
    addBlock,
    updateBlock,
    deleteBlock,
  };
}