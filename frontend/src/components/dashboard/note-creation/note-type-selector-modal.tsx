/**
 * Note Type Selector Modal
 * 개인노트 또는 강의노트 선택 팝업
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/common/modal";
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
      {/* Type Selector Modal */}
      <Modal
        isOpen={isOpen && !showSettingsModal}
        onClose={onClose}
        overlayClassName="fixed inset-0 z-40 transition-opacity"
        overlayStyle={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
        contentClassName="bg-[#2F2F2F] rounded-lg p-8 flex flex-col gap-6 min-w-[500px]"
        closeButton={false}
      >
        {/* Title */}
        <div className="flex justify-between items-center">
          <h2 className="text-white text-2xl font-bold">노트 유형 선택</h2>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-white transition-colors"
          >
            <svg
              width="18"
              height="24"
              viewBox="0 0 18 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L17 23M17 1L1 23"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Type Selection Cards */}
        <div className="flex gap-6">
          {/* 개인 노트 Card */}
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

          {/* 강의 노트 Card */}
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

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-center text-sm py-2"
        >
          취소
        </button>
      </Modal>

      {/* Note Settings Modal */}
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
