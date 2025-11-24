/**
 * etc 패널 컴포넌트 (리팩토링됨)
 * Exam, Summary 기능
 */

"use client";

import { useState } from "react";
import { MenuButton } from "@/components/note/panels/etc-panel/menu-button";
import { Panel } from "./panel";

interface EtcPanelProps {
  isOpen: boolean;
  onClose?: () => void;
}

type MenuType = "exam" | "summary" | null;

export function EtcPanel({ isOpen, onClose }: EtcPanelProps) {
  const [selectedMenu, setSelectedMenu] = useState<MenuType>(null);

  return (
    <Panel isOpen={isOpen} borderColor="green" title="etc." onClose={onClose}>
      <div className="flex flex-col items-center p-3 gap-2.5 w-full h-full">

      {/* 메인 메뉴 버튼들 */}
      {!selectedMenu && (
        <div className="flex flex-col items-center gap-6 w-full flex-shrink-0">
          {/* 상단 버튼 그룹 */}
          <div className="flex flex-row justify-center items-center gap-6 w-full">
            <MenuButton
              label="exam"
              onClick={() => setSelectedMenu("exam")}
              color="bg-[#899649]"
            />
            <MenuButton
              label="summary"
              onClick={() => setSelectedMenu("summary")}
              color="bg-[#6C4F4F]"
            />
          </div>

        </div>
      )}


      {/* Exam 컨텐츠 (추후 구현) */}
      {selectedMenu === "exam" && (
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h4 className="text-white font-semibold">Exam</h4>
            <button
              onClick={() => setSelectedMenu(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <p className="text-gray-400 text-sm">Exam 기능 준비 중...</p>
          </div>
        </div>
      )}

      {/* Summary 컨텐츠 (추후 구현) */}
      {selectedMenu === "summary" && (
        <div className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h4 className="text-white font-semibold">Summary</h4>
            <button
              onClick={() => setSelectedMenu(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <p className="text-gray-400 text-sm">Summary 기능 준비 중...</p>
          </div>
        </div>
      )}

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
    </Panel>
  );
}
