"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/button";
import { NoteSettingsModal } from "@/components/dashboard/create-note-modal";
import { createNote } from "@/lib/note-storage";

export function ActionSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleCreateNote = (noteData: {
    title: string;
    location: string;
    files: File[];
  }) => {
    console.log("노트 생성:", noteData);

    // 노트 저장소에 저장
    const newNote = createNote(noteData);

    setIsModalOpen(false);

    // ID로 노트 페이지 이동
    router.push(`/note?id=${newNote.id}`);
  };

  return (
    <>
      {/* 버튼 그룹 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
          variant="primary"
          size="lg"
          onClick={() => console.log("로그인 클릭")}
        >
          로그인
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsModalOpen(true)}
        >
          새 노트 만들기
        </Button>
      </div>

      {/* 모달 */}
      <NoteSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateNote}
      />
    </>
  );
}
