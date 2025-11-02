/**
 * NotificationContainer Component
 * Screen Bottom Toast Notifications Display Container  */

"use client";

import { useNotificationContainer } from "@/features/notification/use-notification-container";
import { NotificationToast } from "./notification-toast";

export function NotificationContainer() {
  const { displayNotifications, handleClose } = useNotificationContainer();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {displayNotifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => handleClose(notification.id)}
          duration={5000}
        />
      ))}
    </div>
  );
}
