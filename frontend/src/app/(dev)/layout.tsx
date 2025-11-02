/**
 * Development-only Layout
 * This layout ensures dev pages are only accessible in development mode
 */

import { redirect } from "next/navigation";

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect to home if not in development mode
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  return <>{children}</>;
}
