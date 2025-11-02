/**
 * Notification Types
 * Notification (알림) type
 */

/**
 * Notification type
 */
export type NotificationType = "info" | "success" | "warning" | "error";

/**
 * Notification information
 */
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

/**
 * Notification options
 */
export interface NotificationOptions {
  type?: NotificationType;
  duration?: number; // Auto-close time (ms), 0 = manual close only
  action?: {
    label: string;
    onClick: () => void;
  };
}
