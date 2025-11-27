/**
 * etc 패널 컴포넌트
 * Exam, Summary 기능 (AI 연동)
 */

"use client";

import { useState } from "react";
import { MenuButton } from "@/components/note/panels/etc-panel/menu-button";
import { ExamContent } from "@/components/note/panels/etc-panel/exam-content";
import { SummaryContent } from "@/components/note/panels/etc-panel/summary-content";
import { Panel } from "./panel";

interface EtcPanelProps {
  isOpen: boolean;
  noteId: string | null;
  onClose?: () => void;
}

type MenuType = "exam" | "summary" | null;

export function EtcPanel({ isOpen, noteId, onClose }: EtcPanelProps) {
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

      {/* Exam 컨텐츠 */}
      {selectedMenu === "exam" && noteId && (
        <ExamContent 
          noteId={noteId} 
          onBack={() => setSelectedMenu(null)} 
        />
      )}

      {/* Summary 컨텐츠 */}
      {selectedMenu === "summary" && noteId && (
        <SummaryContent 
          noteId={noteId} 
          onBack={() => setSelectedMenu(null)} 
        />
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
