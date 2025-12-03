/**
 * 키보드 단축키 도움말 모달
 */

"use client";

import { Modal } from "@/components/common/modal";
import { NOTE_KEYBOARD_SHORTCUTS } from "@/features/note/keyboard";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 키 표시 컴포넌트
function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-background-base border border-border rounded text-xs text-foreground-secondary font-mono">
      {children}
    </kbd>
  );
}

// 단축키 행 컴포넌트
function ShortcutRow({ keys, description }: { keys: readonly string[]; description: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-1 min-w-[100px]">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center gap-1">
            <KeyBadge>{key}</KeyBadge>
            {index < keys.length - 1 && <span className="text-foreground-tertiary text-xs">+</span>}
          </span>
        ))}
      </div>
      <span className="text-sm text-foreground-secondary">{description}</span>
    </div>
  );
}

// 섹션 컴포넌트
function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: readonly { keys: readonly string[]; description: string }[] }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-brand mb-2 pb-1 border-b border-border">
        {title}
      </h3>
      <div className="space-y-0.5">
        {shortcuts.map((shortcut, index) => (
          <ShortcutRow key={index} keys={shortcut.keys} description={shortcut.description} />
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="키보드 단축키"
      contentClassName="flex flex-col bg-background-modal/90 border border-foreground/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-[90vw] md:w-[600px] max-w-[600px] max-h-[70vh] overflow-hidden"
    >

      {/* 본문 - 2열 레이아웃 */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 왼쪽 열 */}
          <div>
            <ShortcutSection title="PDF 뷰어" shortcuts={NOTE_KEYBOARD_SHORTCUTS.pdf} />
            <ShortcutSection title="패널 전환" shortcuts={NOTE_KEYBOARD_SHORTCUTS.panels} />
          </div>

          {/* 오른쪽 열 */}
          <div>
            <ShortcutSection title="필기 도구" shortcuts={NOTE_KEYBOARD_SHORTCUTS.drawing} />
            <ShortcutSection title="재생" shortcuts={NOTE_KEYBOARD_SHORTCUTS.playback} />
            <ShortcutSection title="일반" shortcuts={NOTE_KEYBOARD_SHORTCUTS.general} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
