/**
 * 스크립트 리비전 관리 훅
 *
 * 스크립트 편집 내용을 백엔드에 리비전으로 저장하고
 * 저장 후 최신 데이터를 리로드하여 UI를 갱신하는 로직 담당
 */

import { useCallback } from "react";
import { saveRevision, getSession, getRevisions, type RevisionContent } from "@/lib/api/transcription.api";
import type { ScriptSegment, WordWithTime } from "@/lib/types";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("useScriptRevision");

export interface UseScriptRevisionProps {
  /** 현재 스크립트 세그먼트 목록 */
  scriptSegments: ScriptSegment[];
  /** 스크립트 세그먼트 업데이트 함수 */
  setScriptSegments: (segments: ScriptSegment[]) => void;
}

export interface UseScriptRevisionReturn {
  /** 리비전 저장 핸들러 */
  handleSaveRevision: (sessionId: string, editedSegments: Record<string, string>) => Promise<void>;
}

/**
 * 스크립트 리비전 관리 훅
 */
export function useScriptRevision({
  scriptSegments,
  setScriptSegments,
}: UseScriptRevisionProps): UseScriptRevisionReturn {
  const handleSaveRevision = useCallback(
    async (sessionId: string, editedSegments: Record<string, string>) => {
      log.debug("리비전 저장 시작:", {
        sessionId,
        editedCount: Object.keys(editedSegments).length,
      });

      // editedSegments를 RevisionContent 형식으로 변환
      const content: RevisionContent = {
        segments: Object.entries(editedSegments).map(([id, editedText]) => {
          const originalSegment = scriptSegments.find((s) => s.id === id);
          return {
            id,
            originalText: originalSegment?.originalText || "",
            editedText,
            timestamp: originalSegment?.timestamp || 0,
          };
        }),
      };

      await saveRevision(sessionId, content);
      log.debug("리비전 저장 완료");

      // 저장 후 최신 데이터 리로드하여 UI 갱신
      try {
        const [sessionData, revisions] = await Promise.all([
          getSession(sessionId),
          getRevisions(sessionId),
        ]);

        // 최신 리비전 맵 생성
        let revisionMap: Record<string, string> = {};
        if (revisions && revisions.length > 0) {
          const latestRevision = revisions[0];
          if (latestRevision.content?.segments) {
            latestRevision.content.segments.forEach((seg) => {
              revisionMap[seg.id] = seg.editedText;
            });
          }
        }

        // 스크립트 세그먼트 업데이트 (리비전 적용)
        if (sessionData.segments && sessionData.segments.length > 0) {
          const updatedSegments = sessionData.segments.map((segment) => {
            const editedText = revisionMap[segment.id];
            return {
              id: segment.id,
              timestamp: segment.startTime * 1000,
              originalText: editedText || segment.text,
              translatedText: undefined,
              words: editedText
                ? undefined
                : (segment.words?.map((word) => ({
                    word: word.word,
                    startTime: word.startTime,
                    confidence: word.confidence || 1.0,
                    wordIndex: word.wordIndex,
                  })) as WordWithTime[] | undefined),
              isPartial: false,
            };
          });

          setScriptSegments(updatedSegments);
          log.debug("리비전 저장 후 세그먼트 업데이트 완료");
        }
      } catch (reloadError) {
        log.error("리비전 저장 후 리로드 실패:", reloadError);
        // 리로드 실패해도 저장 자체는 성공했으므로 에러를 던지지 않음
      }
    },
    [scriptSegments, setScriptSegments]
  );

  return {
    handleSaveRevision,
  };
}
