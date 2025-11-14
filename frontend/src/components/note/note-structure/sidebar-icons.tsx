/**
 * 우측 사이드바 아이콘 버튼들 - Client Component
 * 우측 패널이 닫혀있을 때 표시되는 아이콘들
 * Figma 디자인 기반 2중 원형 구조
 */

"use client";

import Image from "next/image";
import { useNoteEditorStore, usePanelsStore } from "@/stores";
import { useNote } from "@/lib/api/queries/notes.queries";
import { useSidebarIcons } from "@/features/note/note-structure/use-sidebar-icons";

interface SidebarIconsProps {
  noteId?: string | null;
}

export function SidebarIcons({ noteId }: SidebarIconsProps) {
  const { isExpanded, toggleExpand } = useNoteEditorStore();
  const { isVisible } = useSidebarIcons();
  const { toggleNotePanel, toggleFilePanel, toggleScript, toggleCollaborationPanel } = usePanelsStore();

  // Get note data to determine if it's an educator note
  const { data: note } = useNote(noteId || null);
  const isEducatorNote = note?.type === "educator";

  if (isExpanded || !isVisible) return null;

  // 아이콘 버튼 공통 스타일
  const buttonWrapperClass = "flex flex-col items-center w-[53px] h-[67px]";
  const buttonClass = "flex flex-col items-start p-2.5 gap-2 w-[53px] h-[53px] bg-[#363636] border-2 border-white rounded-[30px] hover:bg-[#3a3a3a] transition-colors";
  const iconContainerClass = "flex items-center justify-center w-[33px] h-[33px] bg-[#444444] rounded-[16.5px]";
  const labelClass = "flex items-center justify-center py-0.5 px-2 w-[53px] h-3.5 rounded-[10px] text-white font-bold text-[8px] leading-[10px]";

  return (
    <div className="fixed right-0 top-4 flex flex-col items-center px-3 py-6 gap-[5px] w-[70px] bg-transparent z-50">
      {/* 녹음 아이콘 (Record) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={toggleExpand}
          className={buttonClass}
          title="Record"
        >
          <div className={iconContainerClass}>
            <Image src="/record.svg" alt="Record" width={13} height={17} />
          </div>
        </button>
        <div className={labelClass}>Record</div>
      </div>

      {/* 노트 아이콘 (Notes) */}
      <div className={buttonWrapperClass}>
        <button
          onClick={() => {
            toggleExpand();
            toggleNotePanel();
          }}
          className={buttonClass}
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
          onClick={() => {
            toggleExpand();
            toggleScript();
          }}
          className={buttonClass}
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
          onClick={() => {
            toggleExpand();
            toggleFilePanel();
          }}
          className={buttonClass}
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
        <button onClick={toggleExpand} className={buttonClass} title="More">
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
            onClick={() => {
              toggleExpand();
              toggleCollaborationPanel();
            }}
            className={buttonClass}
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
