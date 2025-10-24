import "./globals.css";
import { QueryProvider } from "@/providers/query-client-provider";
import { NotificationContainer } from "@/components/common/notification-container";

export const metadata = {
  title: "SyncNapse",
  description: "Integrated lecture materials platform",
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
          {children}
          {/* 전역 알림 토스트 컨테이너 */}
          <NotificationContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
