import { useState } from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";

interface RecordingNameModalProps {
  isOpen: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
  duration?: number;
  defaultName?: string;
}

export function RecordingNameModal({
  isOpen,
  onSave,
  onCancel,
  duration,
  defaultName = "",
}: RecordingNameModalProps) {
  const [name, setName] = useState(defaultName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name);
      setName("");
    }
  };

  // 날짜 기반 기본 이름 생성
  const getDefaultName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}_${month}_${day}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="녹음 저장"
      contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-full max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 pt-0">
        <div>
          <label
            htmlFor="recording-name"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            녹음 이름
          </label>
          <input
            id="recording-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getDefaultName()}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#899649] transition-all"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" variant="brand" disabled={!name.trim()}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
