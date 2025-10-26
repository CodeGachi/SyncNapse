import "./globals.css";
import { QueryProvider } from "@/providers/query-client-provider";
import { NotificationContainer } from "@/components/notification/notification-container";

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
          {children}
          <NotificationContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
