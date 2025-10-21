import "./globals.css";
import { QueryProvider } from "@/providers/query-client-provider";

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
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
