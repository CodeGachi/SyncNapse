/**
 * NotificationContainer Hook
 * visibleNotifications Management and Filter with */
import { useEffect, useState } from "react";
import { useNotificationStore } from "@/stores";

export function useNotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  // New Notification Add visible List Add
  useEffect(() => {
    const newIds = notifications
      .filter((n) => !visibleNotifications.includes(n.id))
      .map((n) => n.id);

    if (newIds.length > 0) {
      setVisibleNotifications((prev) => [...newIds, ...prev]);
    }
  }, [notifications, visibleNotifications]);

  // Display Notifications (Recent 5 only)
  const displayNotifications = notifications
    .filter((n) => visibleNotifications.includes(n.id))
    .slice(0, 5);

  // Notification Close Handler
  const handleClose = (notificationId: string) => {
    setVisibleNotifications((prev) =>
      prev.filter((id) => id !== notificationId)
    );
    removeNotification(notificationId);
  };

  return {
    displayNotifications,
    handleClose,
  };
}
