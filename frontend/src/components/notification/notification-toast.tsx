/**
 * NotificationToast Component
 * 하단에 나타나는 토스트 알림
 */

"use client";

import { useEffect, useState } from "react";
import type { Notification } from "@/lib/types";

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  duration?: number;
}

export function NotificationToast({
  notification,
  onClose,
  duration = 5000,
}: NotificationToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // 애니메이션 시간과 맞추기
  };

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const getTypeStyles = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-500 border-green-600";
      case "error":
        return "bg-red-500 border-red-600";
      case "warning":
        return "bg-yellow-500 border-yellow-600";
      case "info":
      default:
        return "bg-blue-500 border-blue-600";
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "error":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "info":
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        ${getTypeStyles()}
        text-white rounded-lg shadow-lg border-2 p-4 min-w-[300px] max-w-[500px]
        transition-all duration-300 ease-in-out
        ${isExiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
      `}
    >
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className="flex-shrink-0">{getIcon()}</div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
          <p className="text-sm opacity-90">{notification.message}</p>

          {/* 액션 버튼 */}
          {notification.action && (
            <button
              onClick={() => {
                notification.action?.onClick();
                handleClose();
              }}
              className="mt-2 text-sm underline hover:no-underline font-medium"
            >
              {notification.action.label}
            </button>
          )}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}