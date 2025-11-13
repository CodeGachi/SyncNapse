import "./globals.css";
import { QueryProvider } from "@/providers/query-client-provider";
import { SyncProvider } from "@/providers/sync-provider";
import { NotificationContainer } from "@/components/notification/notification-container";
import { SyncStatusBar } from "@/components/sync/sync-status-bar";
import { SyncListener } from "@/components/sync-listener";
import { AuthInitializer } from "@/components/auth/auth-initializer";

export const metadata = {
  title: "SyncNapse",
  description: "강의 자료 통합 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          <AuthInitializer />
          <SyncProvider interval={5000} autoSync={true}>
            <SyncStatusBar />
            <SyncListener />
            {children}
            <NotificationContainer />
          </SyncProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
