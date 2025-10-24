import { GoogleLoginButton } from "@/components/auth/google-login-button";

export default function Home() {
  // Server Component - GoogleLoginButton is a Client Component
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">SyncNapse</h1>
          <p className="text-xl text-gray-600">
           스마트한 필기 서비스로 학습을 더 효율적으로
          </p>
        </div>
        <GoogleLoginButton />
        <div className="text-gray-500 text-sm">
          AI 기반 필기 정리와 학습 도구를 경험하세요
        </div>
      </div>
    </main>
  );
}
