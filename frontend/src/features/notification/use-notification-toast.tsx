/**
 * NotificationToast Hook
 * isExit Status, Auto Close, Style and Icon with */
import { useEffect, useState } from "react";
import type { Notification } from "@/lib/types";

interface UseNotificationToastParams {
  duration: number;
  onClose: () => void;
}

export function useNotificationToast({ duration, onClose }: UseNotificationToastParams) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // tion Timeand 맞
  };

  // Auto Close
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return {
    isExiting,
    handleClose,
  };
}

// Typeby Style Import
export function getTypeStyles(type: Notification["type"]) {
  switch (type) {
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
}

// Typeby Icon Import
export function getIcon(type: Notification["type"]) {
  switch (type) {
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
}
