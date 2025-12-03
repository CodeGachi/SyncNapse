/**
 * 노트 유형 선택 모달 컴포넌트
 * 개인노트 또는 강의노트 선택
 */

"use client";

import { useState } from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { NoteSettingsModal } from "./create-note-modal";
import type { NoteData } from "@/lib/types";

interface NoteTypeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: NoteData) => Promise<void> | void;
  defaultFolderId?: string | null;
}

export function NoteTypeSelectorModal({
  isOpen,
  onClose,
  onSubmit,
  defaultFolderId,
}: NoteTypeSelectorModalProps) {
  const [selectedType, setSelectedType] = useState<"student" | "educator" | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleTypeSelect = (type: "student" | "educator") => {
    setSelectedType(type);
    setShowSettingsModal(true);
  };

  const handleSettingsClose = () => {
    setShowSettingsModal(false);
    setSelectedType(null);
  };

  const handleFinalClose = () => {
    setShowSettingsModal(false);
    setSelectedType(null);
    onClose();
  };

  const handleSubmitComplete = async (noteData: NoteData) => {
    await onSubmit(noteData);
    handleFinalClose();
  };

  return (
    <>
      {/* 유형 선택 모달 */}
      <Modal
        isOpen={isOpen && !showSettingsModal}
        onClose={onClose}
        title="노트 유형 선택"
        contentClassName="bg-background-modal/90 border border-border-subtle shadow-2xl shadow-black/50 backdrop-blur-xl rounded-lg p-8 flex flex-col gap-6 min-w-[500px]"
      >

        {/* 유형 선택 카드 */}
        <div className="flex gap-6">
          {/* 개인 노트 카드 */}
          <button
            onClick={() => handleTypeSelect("student")}
            className="flex-1 flex flex-col items-center gap-6 p-8 bg-brand/40 rounded-lg hover:bg-brand/60 transition-colors group"
          >
            <div className="flex items-center justify-center">
              <svg width="60" height="60" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform text-white">
                <path d="M10 2.5C16 2.5 17.5 4 17.5 10C17.5 16 16 17.5 10 17.5C4 17.5 2.5 16 2.5 10C2.5 4 4 2.5 10 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.5 10H7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 7.5V12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <span className="text-foreground font-bold text-xl">개인 노트</span>
              <span className="text-foreground-secondary text-sm text-center">
                개인 학습을 위한 노트
              </span>
            </div>
          </button>

          {/* 강의 노트 카드 */}
          <button
            onClick={() => handleTypeSelect("educator")}
            className="flex-1 flex flex-col items-center gap-6 p-8 bg-brand/40 rounded-lg hover:bg-brand/60 transition-colors group"
          >
            <div className="flex items-center justify-center">
              <div className="text-6xl group-hover:scale-110 transition-transform">
                🎓
              </div>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <span className="text-foreground font-bold text-xl">강의 노트</span>
              <span className="text-foreground-secondary text-sm text-center">
                강의 자료를 포함한 노트
              </span>
            </div>
          </button>
        </div>

        {/* 취소 버튼 */}
        <div className="flex justify-center">
          <Button variant="ghost" onClick={onClose} className="text-foreground-tertiary hover:text-foreground">
            취소
          </Button>
        </div>
      </Modal>

      {/* 노트 설정 모달 */}
      {showSettingsModal && selectedType && (
        <NoteSettingsModal
          isOpen={showSettingsModal}
          onClose={handleSettingsClose}
          onSubmit={handleSubmitComplete}
          defaultFolderId={defaultFolderId}
          noteType={selectedType}
        />
      )}
    </>
  );
}
