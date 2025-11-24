/**
 * Logout Page (Server Component)
 *
 * Handles user logout - clears tokens and redirects to login
 */

import { Suspense } from "react";
import { LogoutHandler } from "@/components/auth/logout-handler";
import { AuthLoading } from "@/components/auth/auth-loading";

// Dynamic route segment config
export const dynamic = "force-dynamic";

export default function LogoutPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <LogoutHandler />
    </Suspense>
  );
}
