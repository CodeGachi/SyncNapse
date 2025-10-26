/**
 * tags 패널 컴포넌트
 * 노트 태그 관리 기능
 */

"use client";

import { useState } from "react";

interface TagsPanelProps {
  isOpen: boolean;
  tags?: string[];
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
}

export function TagsPanel({
  isOpen,
  tags = [],
  onAddTag,
  onRemoveTag,
}: TagsPanelProps) {
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (!newTag.trim()) return;

    if (onAddTag) {
      onAddTag(newTag.trim());
    }
    setNewTag("");
    setIsAdding(false);
  };

  return (
    <div
      className="bg-[#2f2f2f] border-2 border-[#b9b9b9] rounded-2xl overflow-hidden transition-all duration-500 ease-out"
      style={{
        animation: isOpen ? "expandPanel 0.5s ease-out forwards" : "none",
      }}
    >
      <div className="p-4 space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm">Tags</h3>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            {isAdding ? "취소" : "+ 추가"}
          </button>
        </div>

        {/* 태그 입력 폼 */}
        {isAdding && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="태그 입력"
              className="flex-1 px-3 py-2 bg-[#1e1e1e] border border-[#3a3a3a] rounded-md text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        )}

        {/* 태그 목록 */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">
              태그가 없습니다
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1 bg-[#3a3a3a] rounded-full group"
                >
                  <span className="text-white text-xs">#{tag}</span>
                  {onRemoveTag && (
                    <button
                      onClick={() => onRemoveTag(tag)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-all ml-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M9 3L3 9M3 3L9 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes expandPanel {
          0% {
            max-height: 0;
            opacity: 0;
            transform: scaleY(0.8);
            transform-origin: top;
          }
          100% {
            max-height: 500px;
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
