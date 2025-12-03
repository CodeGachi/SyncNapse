/**
 * 드로잉 저장 훅
 *
 * IndexedDB에 드로잉 데이터를 저장하는 콜백 제공
 * 컴포넌트에서 직접 DB 접근을 분리
 */

import { useCallback } from "react";
import { saveDrawing } from "@/lib/db/drawings";
import type { DrawingData } from "@/lib/types/drawing";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useDrawingSave");

export interface UseDrawingSaveProps {
  fileId?: string;
  pageNum: number;
}

export interface UseDrawingSaveReturn {
  /** 드로잉 데이터 저장 콜백 */
  handleDrawingSave: (data: DrawingData) => Promise<void>;
}

/**
 * 드로잉 저장 훅
 */
export function useDrawingSave({
  fileId,
  pageNum,
}: UseDrawingSaveProps): UseDrawingSaveReturn {
  const handleDrawingSave = useCallback(
    async (data: DrawingData) => {
      try {
        await saveDrawing(data);
        log.debug(`드로잉 저장 완료 - 파일: ${fileId}, 페이지: ${pageNum}, ID: ${data.id}`);
      } catch (error) {
        log.error("드로잉 저장 실패:", error);
      }
    },
    [fileId, pageNum]
  );

  return {
    handleDrawingSave,
  };
}
