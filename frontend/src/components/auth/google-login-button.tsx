/**
 * Google Login Button UI
 */

"use client";

import { Button } from "@/components/common/button";
import { useGoogleLogin } from "@/features/auth/google-login";

export function GoogleLoginButton() {
  const { handleGoogleLogin } = useGoogleLogin();

  return (
    <div className="flex flex-col gap-4 items-center">
      <Button variant="primary" size="lg" onClick={handleGoogleLogin}>
        Sign in with Google
      </Button>
    </div>
  );
}
