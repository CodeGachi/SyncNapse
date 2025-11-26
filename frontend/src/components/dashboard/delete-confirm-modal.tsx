import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
    type: 'note' | 'folder';
    name: string;
}

export function DeleteConfirmModal({
    isOpen,
    onClose,
    onDelete,
    type,
    name,
}: DeleteConfirmModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${type === 'note' ? '노트' : '폴더'} 삭제`}
            contentClassName="bg-[#1a1a1a]/90 border border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-8 flex flex-col gap-6 w-[400px]"
        >
            <div className="flex flex-col gap-6">
                <div className="text-gray-300">
                    <p className="mb-2">
                        <span className="text-white font-semibold">&quot;{name}&quot;</span>
                        을(를) 삭제하시겠습니까?
                    </p>
                    {type === 'folder' && (
                        <p className="text-sm text-red-400">
                            * 폴더 내부의 노트도 모두 삭제됩니다.
                        </p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                        이 작업은 되돌릴 수 없습니다.
                    </p>
                </div>
                <div className="flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        취소
                    </Button>
                    <Button
                        variant="brand"
                        onClick={onDelete}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
                    >
                        삭제
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
