/**
 * 알림(Notification) 타입 정의
 */

export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationOptions {
  type?: NotificationType;
  duration?: number; // 자동 사라지는 시간 (ms), 0이면 수동으로만 닫음
  action?: {
    label: string;
    onClick: () => void;
  };
}
