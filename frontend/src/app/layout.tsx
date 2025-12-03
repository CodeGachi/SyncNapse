import "./globals.css";
import { QueryProvider } from "@/providers/query-client-provider";
import { SyncProvider } from "@/providers/sync-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { SyncStatusBar } from "@/components/sync/sync-status-bar";
import { AuthInitializer } from "@/components/auth/auth-initializer";

export const dynamic = "force-dynamic";

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
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-background-base">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <AuthInitializer />
            <SyncProvider interval={5000} autoSync={true}>
              <SyncStatusBar />
              {children}
            </SyncProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
