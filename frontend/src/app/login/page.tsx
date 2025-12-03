import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LoadingScreen } from "@/components/common/loading-screen";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen fullScreen message="로딩 중..." />}>
      <LoginForm />
    </Suspense>
  );
}
