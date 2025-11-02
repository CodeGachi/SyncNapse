/**
 * OAuth Callback Page (Server Component)
 *
 * The page redirected to after Google OAuth login
 * Retrieves the authorization code from the URL, sends it to the backend, and receives a token
 */

import { Suspense } from "react";
import { OAuthCallback } from "@/components/auth/oauth-callback";
import { AuthLoading } from "@/components/auth/auth-loading";

// Dynamic route segment config
export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <OAuthCallback />
    </Suspense>
  );
}
