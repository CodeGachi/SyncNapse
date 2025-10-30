/**
 * NotificationContainer Component
 * 화면 하단에 토스트 알림들을 표시하는 컨테이너
 */

"use client";

import { useEffect, useState } from "react";
import { useNotificationStore } from "@/stores";
import { NotificationToast } from "./notification-toast";

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  // 새 알림이 추가되면 visible 목록에 추가
  useEffect(() => {
    const newIds = notifications
      .filter((n) => !visibleNotifications.includes(n.id))
      .map((n) => n.id);

    if (newIds.length > 0) {
      setVisibleNotifications((prev) => [...newIds, ...prev]);
    }
  }, [notifications, visibleNotifications]);

  // 표시할 알림들 (최근 5개만)
  const displayNotifications = notifications
    .filter((n) => visibleNotifications.includes(n.id))
    .slice(0, 5);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {displayNotifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => {
            setVisibleNotifications((prev) =>
              prev.filter((id) => id !== notification.id)
            );
            removeNotification(notification.id);
          }}
          duration={5000}
        />
      ))}
    </div>
  );
}
