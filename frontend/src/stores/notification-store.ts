/**
 * 알림 Zustand Store
 * 전역 알림 상태 관리
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Notification, NotificationOptions, NotificationType } from "@/lib/types";

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;

  // Actions
  addNotification: (
    title: string,
    message: string,
    options?: NotificationOptions
  ) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      // Initial State
      notifications: [],
      unreadCount: 0,

      // Actions
      addNotification: (title, message, options = {}) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification: Notification = {
          id,
          type: options.type || "info",
          title,
          message,
          timestamp: new Date(),
          read: false,
          action: options.action,
        };

        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // 자동 삭제 설정
        if (options.duration && options.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, options.duration);
        }

        return id;
      },

      removeNotification: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
          };
        }),

      markAsRead: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (!notification || notification.read) return state;

          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: state.unreadCount - 1,
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      clearAll: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),
    }),
    {
      name: "NotificationStore",
      enabled: process.env.NODE_ENV === "development",
      anonymousActionType: "notificationStore",
    }
  )
);

// 편의 함수들
export const notify = {
  info: (title: string, message: string, options?: NotificationOptions) =>
    useNotificationStore.getState().addNotification(title, message, {
      ...options,
      type: "info",
    }),

  success: (title: string, message: string, options?: NotificationOptions) =>
    useNotificationStore.getState().addNotification(title, message, {
      ...options,
      type: "success",
    }),

  warning: (title: string, message: string, options?: NotificationOptions) =>
    useNotificationStore.getState().addNotification(title, message, {
      ...options,
      type: "warning",
    }),

  error: (title: string, message: string, options?: NotificationOptions) =>
    useNotificationStore.getState().addNotification(title, message, {
      ...options,
      type: "error",
    }),
};
