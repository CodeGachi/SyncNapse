import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
