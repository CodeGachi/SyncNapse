import "./globals.css";
import { QueryProvider } from "@/providers/query-client-provider";
import { SyncProvider } from "@/providers/sync-provider";
import { SyncStatusBar } from "@/components/sync/sync-status-bar";
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
      <body className="bg-[#1e1e1e]">
        <QueryProvider>
          <AuthInitializer />
          <SyncProvider interval={5000} autoSync={true}>
            <SyncStatusBar />
            {children}
          </SyncProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
