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
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-[#1e1e1e] border border-[#4f4f4f] rounded text-xs text-gray-300 font-mono">
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
            {index < keys.length - 1 && <span className="text-gray-500 text-xs">+</span>}
          </span>
        ))}
      </div>
      <span className="text-sm text-gray-300">{description}</span>
    </div>
  );
}

// 섹션 컴포넌트
function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: readonly { keys: readonly string[]; description: string }[] }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-[#AFC02B] mb-2 pb-1 border-b border-[#3f3f3f]">
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
      overlayClassName="fixed inset-0 z-[60] transition-opacity"
      overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      containerClassName="fixed inset-0 z-[60] flex items-center justify-center p-4"
      contentClassName="flex flex-col bg-[#2F2F2F] rounded-[20px] w-[600px] max-h-[80vh] border border-[#575757] overflow-hidden"
      closeButton={false}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-[#3f3f3f]">
        <div className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AFC02B" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h8" />
          </svg>
          <h2 className="font-bold text-xl text-white">키보드 단축키</h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3f3f3f] rounded transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6L18 18M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* 본문 - 2열 레이아웃 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-2 gap-6">
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

      {/* 푸터 */}
      <div className="px-6 py-3 border-t border-[#3f3f3f] bg-[#252525]">
        <p className="text-xs text-gray-500 text-center">
          Tip: 입력 필드에서는 일부 단축키가 비활성화됩니다
        </p>
      </div>
    </Modal>
  );
}
