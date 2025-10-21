"use client";

import { useState } from "react";
import { Modal } from "@/components/common/modal";
import { Button } from "@/components/common/button";
import { formatFileSize, formatDate } from "@/lib/utils";
import type { FileConflict, ConflictResolution } from "@/lib/types";

interface FileConflictModalProps {
  isOpen: boolean;
  conflicts: FileConflict[];
  onResolve: (resolutions: Map<File, ConflictResolution>) => void;
  onCancel: () => void;
}

export function FileConflictModal({
  isOpen,
  conflicts,
  onResolve,
  onCancel,
}: FileConflictModalProps) {
  const [resolutions, setResolutions] = useState<Map<File, ConflictResolution>>(
    new Map()
  );
  const [applyToAll, setApplyToAll] = useState(false);

  const handleResolve = (
    file: File,
    resolution: ConflictResolution,
    applyToAll = false
  ) => {
    if (applyToAll) {
      // 모든 충돌 파일에 동일한 해결 방법 적용
      const allResolutions = new Map<File, ConflictResolution>();
      conflicts.forEach((conflict) => {
        allResolutions.set(conflict.newFile, resolution);
      });
      onResolve(allResolutions);
    } else {
      const newResolutions = new Map(resolutions);
      newResolutions.set(file, resolution);
      setResolutions(newResolutions);

      // 모든 충돌이 해결되었으면 완료
      if (newResolutions.size === conflicts.length) {
        onResolve(newResolutions);
      }
    }
  };

  if (conflicts.length === 0) return null;

  // 현재 처리 중인 충돌 (아직 해결되지 않은 첫 번째 충돌)
  const currentConflict = conflicts.find(
    (c) => !resolutions.has(c.newFile)
  ) || conflicts[0];

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="파일 충돌">
      <div className="space-y-6">
        {/* 진행 상황 */}
        {conflicts.length > 1 && (
          <div className="text-sm text-gray-600">
            {resolutions.size + 1} / {conflicts.length} 파일 처리 중
          </div>
        )}

        {/* 충돌 정보 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">
                같은 이름의 파일이 이미 존재합니다
              </h3>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{currentConflict.newFile.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 파일 비교 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 기존 파일 */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">
              기존 파일
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">크기:</span>{" "}
                <span className="font-medium">
                  {formatFileSize(currentConflict.existingFile.size)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">수정일:</span>{" "}
                <span className="font-medium">
                  {formatDate(currentConflict.existingFile.lastModified)}
                </span>
              </div>
            </div>
          </div>

          {/* 새 파일 */}
          <div className="border border-green-300 rounded-lg p-4 bg-green-50">
            <h4 className="font-semibold text-sm text-gray-700 mb-3">
              새 파일
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">크기:</span>{" "}
                <span className="font-medium">
                  {formatFileSize(currentConflict.newFile.size)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">수정일:</span>{" "}
                <span className="font-medium">
                  {formatDate(currentConflict.newFile.lastModified)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 해결 옵션 */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900">어떻게 처리하시겠습니까?</h4>

          {/* 덮어쓰기 */}
          <button
            onClick={() =>
              handleResolve(currentConflict.newFile, "replace", applyToAll)
            }
            className="w-full text-left border-2 border-gray-300 hover:border-[#AFC02B] hover:bg-green-50 rounded-lg p-4 transition-colors"
          >
            <div className="font-medium text-gray-900 mb-1">
              기존 파일 덮어쓰기
            </div>
            <div className="text-sm text-gray-600">
              기존 파일을 새 파일로 교체합니다
            </div>
          </button>

          {/* 이름 변경 */}
          <button
            onClick={() =>
              handleResolve(currentConflict.newFile, "rename", applyToAll)
            }
            className="w-full text-left border-2 border-gray-300 hover:border-[#AFC02B] hover:bg-green-50 rounded-lg p-4 transition-colors"
          >
            <div className="font-medium text-gray-900 mb-1">
              다른 이름으로 저장
            </div>
            <div className="text-sm text-gray-600">
              새 파일을 다른 이름으로 저장합니다
              {currentConflict.suggestedName && (
                <span className="block mt-1 text-[#AFC02B] font-medium">
                  제안: {currentConflict.suggestedName}
                </span>
              )}
            </div>
          </button>

          {/* 건너뛰기 */}
          <button
            onClick={() =>
              handleResolve(currentConflict.newFile, "skip", applyToAll)
            }
            className="w-full text-left border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg p-4 transition-colors"
          >
            <div className="font-medium text-gray-900 mb-1">건너뛰기</div>
            <div className="text-sm text-gray-600">
              이 파일은 업로드하지 않습니다
            </div>
          </button>
        </div>

        {/* 모두 적용 체크박스 */}
        {conflicts.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="w-4 h-4 accent-[#AFC02B]"
            />
            <span>모든 충돌 파일에 동일하게 적용</span>
          </label>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
        </div>
      </div>
    </Modal>
  );
}
