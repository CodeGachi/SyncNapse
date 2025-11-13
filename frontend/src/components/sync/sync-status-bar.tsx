/**
 * 동기화 상태 표시바
 *
 * 화면 상단에 고정되어 동기화 상태를 실시간으로 표시
 */

"use client";

import { useEffect, useState } from "react";
import { useSyncStore } from "@/lib/sync/sync-store";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

export function SyncStatusBar() {
  const { queue, isSyncing, lastSyncTime, syncError } = useSyncStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // 동기화 중이거나, 큐에 항목이 있거나, 에러가 있으면 표시
  useEffect(() => {
    if (isDismissed) return;

    const shouldShow =
      isSyncing || queue.items.length > 0 || syncError !== null;
    setIsVisible(shouldShow);
  }, [isSyncing, queue.items.length, syncError, isDismissed]);

  // 성공 후 3초 뒤 자동 숨김
  useEffect(() => {
    if (!isSyncing && queue.items.length === 0 && !syncError && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, queue.items.length, syncError, isVisible]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  // 에러 해제 시 dismissed 초기화
  useEffect(() => {
    if (syncError === null) {
      setIsDismissed(false);
    }
  }, [syncError]);

  if (!isVisible) return null;

  // 상태 결정
  const getStatus = () => {
    if (syncError) {
      return {
        type: "error" as const,
        icon: <AlertCircle size={18} />,
        text: "동기화 실패",
        description: syncError,
        bgColor: "bg-red-500/20",
        borderColor: "border-red-500/50",
        textColor: "text-red-400",
      };
    }

    if (isSyncing) {
      return {
        type: "syncing" as const,
        icon: <RefreshCw size={18} className="animate-spin" />,
        text: "동기화 중...",
        description: `${queue.items.length}개 항목 처리 중`,
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-500/50",
        textColor: "text-blue-400",
      };
    }

    if (queue.items.length > 0) {
      return {
        type: "pending" as const,
        icon: <Cloud size={18} />,
        text: "동기화 대기 중",
        description: `${queue.items.length}개 항목 대기`,
        bgColor: "bg-yellow-500/20",
        borderColor: "border-yellow-500/50",
        textColor: "text-yellow-400",
      };
    }

    // 완료
    return {
      type: "success" as const,
      icon: <CheckCircle2 size={18} />,
      text: "동기화 완료",
      description: lastSyncTime
        ? `마지막 동기화: ${new Date(lastSyncTime).toLocaleTimeString("ko-KR")}`
        : "모든 변경사항이 저장되었습니다",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/50",
      textColor: "text-green-400",
    };
  };

  const status = getStatus();

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] ${status.bgColor} border-b ${status.borderColor} backdrop-blur-sm`}
      style={{
        animation: "slideDown 0.3s ease-out",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        {/* 상태 아이콘 + 텍스트 */}
        <div className="flex items-center gap-3">
          <div className={status.textColor}>{status.icon}</div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className={`${status.textColor} font-bold text-sm`}>
              {status.text}
            </span>
            <span className="text-white/60 text-xs">{status.description}</span>
          </div>
        </div>

        {/* 오른쪽 액션 */}
        <div className="flex items-center gap-2">
          {/* 오프라인 표시 */}
          {!navigator.onLine && (
            <div className="flex items-center gap-1 text-white/60 text-xs">
              <CloudOff size={14} />
              <span>오프라인</span>
            </div>
          )}

          {/* 닫기 버튼 */}
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white transition-colors p-1"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
