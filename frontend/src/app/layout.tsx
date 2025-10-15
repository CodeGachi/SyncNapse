import "./globals.css";

export const metadata = {
  title: "SyncNapse",
  description: "Study assistant platform",
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
