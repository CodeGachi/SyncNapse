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
      contentClassName="bg-background-surface/90 border border-border shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-full max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 pt-0">
        <div>
          <label
            htmlFor="recording-name"
            className="block text-sm font-medium text-foreground-secondary mb-2"
          >
            녹음 이름
          </label>
          <input
            id="recording-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getDefaultName()}
            className="w-full px-4 py-3 bg-foreground/5 border border-border rounded-xl text-foreground placeholder-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand transition-all"
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
