import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: "local" | "server") => void;
  localDate: string;
  serverDate: string;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  onResolve,
  localDate,
  serverDate,
}: ConflictResolutionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="동기화 충돌 발생"
      contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-[500px]"
    >
      <div className="flex flex-col gap-6 p-6 pt-0">
        <p className="text-gray-300">
          서버와 로컬 데이터 간에 충돌이 발생했습니다.<br />
          어떤 데이터를 유지하시겠습니까?
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-bold text-white mb-1">내 기기 데이터</p>
              <p className="text-sm text-gray-400">{localDate}</p>
            </div>
            <Button
              variant="brand"
              size="sm"
              onClick={() => onResolve("local")}
            >
              선택
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <p className="font-bold text-white mb-1">서버 데이터</p>
              <p className="text-sm text-gray-400">{serverDate}</p>
            </div>
            <Button
              variant="brand"
              size="sm"
              onClick={() => onResolve("server")}
            >
              선택
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            나중에 결정
          </Button>
        </div>
      </div>
    </Modal>
  );
}
