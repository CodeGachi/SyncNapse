/**
 * Recording Name Setting Modal
 * Recording End When User Recording Title Input can Exists  */

"use client";

import { useState } from "react";

interface RecordingNameModalProps {
  isOpen: boolean;
  duration: number;
  onSave: (title: string) => void;
  onCancel: () => void;
}

export function RecordingNameModal({
  isOpen,
  duration,
  onSave,
  onCancel,
}: RecordingNameModalProps) {
  const [title, setTitle] = useState("");

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSave = () => {
    // 제목이 비어있어도 OK - use-recording-control에서 자동으로 타임스탬프 생성
    onSave(title.trim());
    setTitle("");
  };

  const handleCancel = () => {
    setTitle("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#2a2a2a] rounded-lg p-6 w-[400px] border border-[#444444]">
        <h2 className="text-white text-lg font-bold mb-4">녹음 저장</h2>

        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">녹음 시간: {formatDuration(duration)}</p>
        </div>

        <div className="mb-6">
          <label className="text-white text-sm mb-2 block">
            녹음 제목 <span className="text-gray-500 text-xs">(선택사항)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="2025_01_15_14:30:45"
            className="w-full bg-[#1e1e1e] border border-[#444444] rounded px-3 py-2 text-white focus:outline-none focus:border-[#666666] placeholder:text-gray-600"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              } else if (e.key === "Escape") {
                handleCancel();
              }
            }}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            💡 제목을 입력하지 않으면 녹음 시작 시간으로 자동 저장됩니다
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-[#444444] hover:bg-[#555555] text-white rounded transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
