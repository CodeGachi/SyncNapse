/**
 * 녹음 목록 드롭다운 컴포넌트
 * 저장된 녹음본 리스트를 표시하고 선택 가능
 */

"use client";

import { useEffect, useRef } from "react";

interface Recording {
  id: number;
  title: string;
  time: string;
  date: string;
  duration: string;
  sessionId?: string;
  audioRecordingId?: string; // 타임라인 이벤트 로드용
}

interface RecordingListDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  recordings: Recording[];
  onSelectRecording: (sessionId: string, audioRecordingId?: string) => void;
  onDeleteRecording: (sessionId: string) => void;
}

export function RecordingListDropdown({
  isOpen,
  onClose,
  recordings,
  onSelectRecording,
  onDeleteRecording,
}: RecordingListDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // 녹음 목록 버튼 클릭은 무시 (버튼이 토글 처리함)
      if (target.closest('button[title="저장된 녹음"]')) {
        return;
      }

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose();
      }
    }

    if (isOpen) {
      // mousedown 대신 click 사용하여 버튼 클릭과 타이밍 분리
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-80 max-h-96 bg-background-elevated border border-border rounded-lg shadow-lg z-50 overflow-hidden"
    >
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-foreground font-semibold">저장된 녹음 ({recordings.length})</h3>
      </div>

      {/* 녹음 리스트 */}
      <div className="max-h-80 overflow-y-auto">
        {recordings.length === 0 ? (
          <div className="px-4 py-8 text-center text-foreground-tertiary">
            저장된 녹음이 없습니다
          </div>
        ) : (
          <div className="py-2">
            {recordings.map((recording) => (
              <div
                key={recording.sessionId || recording.id}
                className="px-4 py-3 hover:bg-background-overlay cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => {
                      if (recording.sessionId) {
                        onSelectRecording(recording.sessionId, recording.audioRecordingId);
                        onClose();
                      }
                    }}
                  >
                    <p className="text-foreground font-medium truncate">{recording.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-foreground-tertiary">
                      <span>{recording.date}</span>
                      <span>•</span>
                      <span>{recording.time}</span>
                      <span>•</span>
                      <span>{recording.duration}</span>
                    </div>
                  </div>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (recording.sessionId && confirm(`"${recording.title}" 녹음을 삭제하시겠습니까?`)) {
                        onDeleteRecording(recording.sessionId);
                      }
                    }}
                    className="ml-2 p-1 opacity-0 group-hover:opacity-100 text-foreground-tertiary hover:text-red-500 transition-all"
                    title="삭제"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M13 4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
