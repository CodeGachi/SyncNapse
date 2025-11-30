/**
 * 노트 유형 선택 모달 컴포넌트
 * 개인노트 또는 강의노트 선택
 */

"use client";

import { useState } from "react";
import Image from "next/image";
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
        contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-lg p-8 flex flex-col gap-6 min-w-[500px]"
      >

        {/* 유형 선택 카드 */}
        <div className="flex gap-6">
          {/* 개인 노트 카드 */}
          <button
            onClick={() => handleTypeSelect("student")}
            className="flex-1 flex flex-col items-center gap-6 p-8 bg-[rgba(175,192,43,0.4)] rounded-lg hover:bg-[rgba(175,192,43,0.6)] transition-colors group"
          >
            <div className="flex items-center justify-center">
              <Image
                src="/대시보드/Text input.svg"
                alt="개인 노트"
                width={60}
                height={60}
                className="group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="flex flex-col gap-2 items-center">
              <span className="text-white font-bold text-xl">개인 노트</span>
              <span className="text-white/70 text-sm text-center">
                개인 학습을 위한 노트
              </span>
            </div>
          </button>

          {/* 강의 노트 카드 */}
          <button
            onClick={() => handleTypeSelect("educator")}
            className="flex-1 flex flex-col items-center gap-6 p-8 bg-[rgba(175,192,43,0.4)] rounded-lg hover:bg-[rgba(175,192,43,0.6)] transition-colors group"
          >
            <div className="flex items-center justify-center">
              <div className="text-6xl group-hover:scale-110 transition-transform">
                🎓
              </div>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <span className="text-white font-bold text-xl">강의 노트</span>
              <span className="text-white/70 text-sm text-center">
                강의 자료를 포함한 노트
              </span>
            </div>
          </button>
        </div>

        {/* 취소 버튼 */}
        <div className="flex justify-center">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
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
