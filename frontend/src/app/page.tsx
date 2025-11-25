"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/common/loading-screen";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard/main");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <LoadingScreen fullScreen message="로딩 중..." />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Logo & Title */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 tracking-tight">
              SyncNapse
            </h1>
            <p className="text-2xl md:text-3xl text-gray-700 font-light">
              스마트한 필기로 학습을 혁신하다
            </p>
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            실시간 녹음과 자막, 시간별 데이터 동기화로 학습의 흐름을 유지하세요.
            <br />
            SyncNapse와 함께 더 효율적인 학습을 경험하세요.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              시작하기
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              자세히 알아보기
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            주요 기능
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Real-time Recording */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">실시간 녹음</h3>
              <p className="text-gray-600 leading-relaxed">
                강의나 회의를 고품질로 녹음하고, 자동으로 정리된 필기와 함께 저장하세요.
              </p>
            </div>

            {/* Feature 2: AI Subtitles */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">실시간 자막 생성</h3>
              <p className="text-gray-600 leading-relaxed">
                음성을 실시간으로 텍스트로 변환하여 정확한 자막을 자동으로 생성합니다.
              </p>
            </div>

            {/* Feature 3: Smart Notes */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">스마트 필기</h3>
              <p className="text-gray-600 leading-relaxed">
                PDF 자료 위에 직접 필기하고, 음성과 동기화된 노트를 작성하세요.
              </p>
            </div>

            {/* Feature 4: Folder Management */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">폴더 관리</h3>
              <p className="text-gray-600 leading-relaxed">
                과목별, 주제별로 노트를 체계적으로 정리하고 쉽게 찾아보세요.
              </p>
            </div>

            {/* Feature 5: Cloud Sync */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">클라우드 동기화</h3>
              <p className="text-gray-600 leading-relaxed">
                모든 기기에서 실시간으로 동기화되어 언제 어디서나 접근 가능합니다.
              </p>
            </div>

            {/* Feature 6: Time-based Linking */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-pink-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">시간별 동기화</h3>
              <p className="text-gray-600 leading-relaxed">
                오디오, 자막, 필기 데이터를 시간별로 링킹하여 학습의 흐름을 자연스럽게 유지합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-gray-600">
            무료로 가입하고 스마트한 학습 경험을 시작하세요
          </p>
          <Link
            href="/login"
            className="inline-block px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-white/50 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p>&copy; 2025 SyncNapse. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
