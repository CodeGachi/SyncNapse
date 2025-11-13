/**
 * 충돌 해결 모달
 *
 * 로컬과 서버의 데이터가 충돌할 때 사용자가 선택할 수 있는 UI
 */

"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export interface ConflictData {
  entityType: string;
  entityId: string;
  localData: any;
  remoteData: any;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflict: ConflictData | null;
  onResolve: (resolution: "local" | "remote" | "merge") => void;
  onCancel: () => void;
}

export function ConflictResolutionModal({
  isOpen,
  conflict,
  onResolve,
  onCancel,
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<
    "local" | "remote" | "merge"
  >("local");

  if (!isOpen || !conflict) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
      <div className="bg-[#2F2F2F] rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-yellow-400" />
            <h2 className="text-white text-lg font-bold">데이터 충돌 감지</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 설명 */}
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              로컬과 서버의 <strong>{conflict.entityType}</strong> 데이터가
              서로 다릅니다.
              <br />
              어느 버전을 사용할지 선택해주세요.
            </p>
          </div>

          {/* 옵션 선택 */}
          <div className="space-y-3">
            {/* 로컬 우선 */}
            <button
              onClick={() => setSelectedResolution("local")}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedResolution === "local"
                  ? "border-[#AFC02B] bg-[#AFC02B]/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2
                      size={20}
                      className={
                        selectedResolution === "local"
                          ? "text-[#AFC02B]"
                          : "text-white/40"
                      }
                    />
                    <h3 className="text-white font-bold">
                      내 컴퓨터 버전 사용 (로컬)
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm mb-2">
                    이 컴퓨터에 저장된 최신 버전을 사용하고 서버를
                    덮어씁니다.
                  </p>
                  <p className="text-white/40 text-xs">
                    최종 수정: {formatDate(conflict.localUpdatedAt)}
                  </p>
                </div>
              </div>
            </button>

            {/* 서버 우선 */}
            <button
              onClick={() => setSelectedResolution("remote")}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedResolution === "remote"
                  ? "border-[#AFC02B] bg-[#AFC02B]/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2
                      size={20}
                      className={
                        selectedResolution === "remote"
                          ? "text-[#AFC02B]"
                          : "text-white/40"
                      }
                    />
                    <h3 className="text-white font-bold">
                      서버 버전 사용 (원격)
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm mb-2">
                    서버에 저장된 최신 버전을 다운로드하고 로컬을 덮어씁니다.
                  </p>
                  <p className="text-white/40 text-xs">
                    최종 수정: {formatDate(conflict.remoteUpdatedAt)}
                  </p>
                </div>
              </div>
            </button>

            {/* 병합 (추후 구현) */}
            <button
              disabled
              className="w-full text-left p-4 rounded-lg border-2 border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={20} className="text-white/40" />
                    <h3 className="text-white font-bold">
                      병합 (추후 지원 예정)
                    </h3>
                  </div>
                  <p className="text-white/60 text-sm">
                    두 버전의 변경사항을 모두 유지하도록 병합합니다.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* 데이터 미리보기 */}
          <details className="bg-white/5 rounded-lg">
            <summary className="px-4 py-3 text-white text-sm font-medium cursor-pointer hover:bg-white/10 transition-colors rounded-lg">
              데이터 비교 보기
            </summary>
            <div className="px-4 pb-4 pt-2 space-y-3">
              {/* 로컬 데이터 */}
              <div>
                <h4 className="text-white/60 text-xs font-bold mb-1">
                  로컬 데이터:
                </h4>
                <pre className="bg-black/30 rounded p-2 text-white/80 text-xs overflow-x-auto">
                  {JSON.stringify(conflict.localData, null, 2)}
                </pre>
              </div>

              {/* 서버 데이터 */}
              <div>
                <h4 className="text-white/60 text-xs font-bold mb-1">
                  서버 데이터:
                </h4>
                <pre className="bg-black/30 rounded p-2 text-white/80 text-xs overflow-x-auto">
                  {JSON.stringify(conflict.remoteData, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onResolve(selectedResolution)}
            className="px-6 py-2 bg-[#AFC02B] text-black rounded font-medium hover:bg-[#AFC02B]/90 transition-colors"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
