/**
 * 우측 사이드바 아이콘 버튼들 - Client Component
 * 우측 패널이 닫혀있을 때 표시되는 아이콘들
 * Figma 디자인 기반 2중 원형 구조
 */

"use client";

import Image from "next/image";
import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";

interface SidebarIconsProps {
  noteId?: string | null;
  isEducator?: boolean; // 교육자 노트 여부 (prop으로 명시적 전달)
}

export function SidebarIcons({ noteId, isEducator }: SidebarIconsProps) {
  const { isExpanded, toggleExpand } = useNoteEditorStore();
  const {
    toggleNotePanel,
    toggleFilePanel,
    toggleScript,
    toggleEtcPanel,
    toggleCollaborationPanel,
    isNotePanelOpen,
    isFilePanelOpen,
    isScriptOpen,
    isEtcPanelOpen,
    isCollaborationPanelOpen
  } = usePanelsStore();

  // Get note data to determine if it's an educator note
  const { data: note } = useNote(noteId || null);
  // 교육자 노트 여부: prop으로 명시적 전달되면 우선 사용, 아니면 note 데이터에서 가져오기
  const isEducatorNote = isEducator ?? (note?.type === "educator");

  // Helper to open panel and expand sidebar if needed
  const handlePanelToggle = (toggleFn: () => void, isCurrentlyActive: boolean) => {
    // 패널이 닫혀있으면 열기
    if (!isExpanded) {
      toggleExpand();
    }

    // 개별 패널 토글
    toggleFn();

    // 활성화된 패널을 다시 클릭한 경우 -> 패널 닫고, 다른 패널도 모두 닫혀있으면 500px 패널도 닫기
    if (isCurrentlyActive && isExpanded) {
      // 토글 후 상태 확인을 위해 setTimeout 사용
      setTimeout(() => {
        const allPanelsClosed = !isScriptOpen && !isFilePanelOpen && !isEtcPanelOpen && !isCollaborationPanelOpen;
        if (allPanelsClosed) {
          toggleExpand(); // 500px 패널 닫기
        }
      }, 0);
    }
  };

  // 아이콘 버튼 공통 스타일
  const buttonWrapperClass = "flex flex-col items-center w-[53px] h-[67px]";
  const getButtonClass = (isActive: boolean) =>
    `flex flex-col items-start p-2.5 gap-2 w-[53px] h-[53px] bg-[#363636] border-2 ${
      isActive ? 'border-[#afc02b]' : 'border-white'
    } rounded-[30px] hover:bg-[#3a3a3a] transition-colors`;
  const iconContainerClass = "flex items-center justify-center w-[33px] h-[33px] bg-[#444444] rounded-[16.5px]";
  const labelClass = "flex items-center justify-center py-0.5 px-2 w-[53px] h-3.5 rounded-[10px] text-white font-bold text-[10px] leading-[12px]";

  return (
    <div className="flex flex-col items-center flex-shrink-0 px-1 py-6 gap-[5px] w-[60px] bg-[#1e1e1e]">
      {/* 노트 아이콘 (Notes) - 뷰어 하단 노트만 토글, 사이드바 확장 안 함 */}
      <div className={buttonWrapperClass}>
        <button
          onClick={toggleNotePanel}
          className={getButtonClass(isNotePanelOpen)}
          title="Notes"
        >
          <div className={iconContainerClass}>
            <Image src="/notebook.svg" alt="Notes" width={24} height={24} />
          </div>
        </button>
        <div className={labelClass}>Notes</div>
      </div>

      {/* 스크립트 아이콘 (Script) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={() => handlePanelToggle(toggleScript, isScriptOpen)}
          className={getButtonClass(isScriptOpen)}
          title="Script"
        >
          <div className={iconContainerClass}>
            <Image src="/subtitles.svg" alt="Script" width={20} height={20} />
          </div>
        </button>
        <div className={labelClass}>Script</div>
      </div>

      {/* 파일 아이콘 (Files) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={() => handlePanelToggle(toggleFilePanel, isFilePanelOpen)}
          className={getButtonClass(isFilePanelOpen)}
          title="Files"
        >
          <div className={iconContainerClass}>
            <Image src="/file.svg" alt="Files" width={24} height={24} />
          </div>
        </button>
        <div className={labelClass}>Files</div>
      </div>

      {/* 더보기 아이콘 (etc) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={() => handlePanelToggle(toggleEtcPanel, isEtcPanelOpen)}
          className={getButtonClass(isEtcPanelOpen)}
          title="More"
        >
          <div className={iconContainerClass}>
            <Image src="/overflow-menu.svg" alt="More" width={24} height={24} />
          </div>
        </button>
        <div className={labelClass}>etc</div>
      </div>

      {/* 협업 아이콘 (Collaboration) - 교육자 노트만 */}
      {isEducatorNote && (
        <div className={buttonWrapperClass}>
          <button
            onClick={() => handlePanelToggle(toggleCollaborationPanel, isCollaborationPanelOpen)}
            className={getButtonClass(isCollaborationPanelOpen)}
            title="협업"
          >
            <div className={iconContainerClass}>
              <Image src="/collaborate.svg" alt="Collaborate" width={24} height={24} />
            </div>
          </button>
          <div className={labelClass}>협업</div>
        </div>
      )}
    </div>
  );
}
