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
            contentClassName="bg-background-modal/90 border border-border shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 w-[90vw] md:w-[400px] max-w-[400px]"
        >
            <div className="flex flex-col gap-6">
                <div className="text-foreground-secondary">
                    <p className="mb-2">
                        <span className="text-foreground font-semibold">&quot;{name}&quot;</span>
                        을(를) 삭제하시겠습니까?
                    </p>
                    {type === 'folder' && (
                        <p className="text-sm text-status-error">
                            * 폴더 내부의 노트도 모두 삭제됩니다.
                        </p>
                    )}
                    <p className="text-sm text-foreground-tertiary mt-2">
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
                        className="bg-status-error hover:bg-status-error/90 text-white shadow-status-error/20"
                    >
                        삭제
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
