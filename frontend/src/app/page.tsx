"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/common/loading-screen";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Mic,
  Subtitles,
  PenTool,
  FolderOpen,
  Cloud,
  Clock,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

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

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#1a1a1a] text-white selection:bg-[#AFC02B] selection:text-black overflow-x-hidden">
      {/* Background Gradients - Made subtler */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#AFC02B]/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#AFC02B]/3 rounded-full blur-[150px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8">
              <Image
                src="/대시보드/Logo.svg"
                alt="SyncNapse"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#AFC02B] transition-colors">
              SyncNapse
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-bold bg-[#AFC02B] text-black rounded-lg hover:bg-[#c2d43b] transition-all shadow-lg shadow-[#AFC02B]/20"
            >
              시작하기
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 min-h-screen flex flex-col items-center justify-center text-center z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-5xl mx-auto space-y-8"
        >
          {/* Badge Removed as per feedback */}

          <motion.h1 variants={fadeInUp} className="text-6xl md:text-8xl font-bold tracking-tight leading-tight">
            학습의 모든 순간을<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#AFC02B] to-[#e4f060]">완벽하게 동기화</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            실시간 녹음, AI 자막, 그리고 필기까지.<br />
            당신의 학습 흐름이 끊기지 않도록 SyncNapse가 도와드립니다.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link
              href="/login"
              className="group px-8 py-4 bg-[#AFC02B] hover:bg-[#c2d43b] text-black text-lg font-bold rounded-xl transition-all duration-200 shadow-xl shadow-[#AFC02B]/20 flex items-center gap-2"
            >
              무료로 시작하기
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-[#262626] hover:bg-[#2F2F2F] border border-white/10 text-white text-lg font-medium rounded-xl transition-all duration-200"
            >
              기능 살펴보기
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              학습을 위한 <span className="text-[#AFC02B]">최고의 도구들</span>
            </h2>
            <p className="text-xl text-gray-400">
              더 이상 여러 앱을 오가며 시간을 낭비하지 마세요.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Mic className="w-8 h-8" />,
                title: "실시간 녹음",
                desc: "고품질 녹음과 함께 중요한 순간을 놓치지 마세요."
              },
              {
                icon: <Subtitles className="w-8 h-8" />,
                title: "AI 자막 생성",
                desc: "음성을 실시간 텍스트로 변환하여 자막을 생성합니다."
              },
              {
                icon: <PenTool className="w-8 h-8" />,
                title: "스마트 필기",
                desc: "PDF 위에 자유롭게 필기하고 음성과 동기화하세요."
              },
              {
                icon: <FolderOpen className="w-8 h-8" />,
                title: "폴더 관리",
                desc: "과목별로 깔끔하게 정리하고 쉽게 찾아보세요."
              },
              {
                icon: <Cloud className="w-8 h-8" />,
                title: "클라우드 동기화",
                desc: "어디서든 접속하여 학습을 이어가세요."
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: "타임라인 링킹",
                desc: "필기한 시점의 녹음 내용을 즉시 다시 들어보세요."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
                className="bg-[#262626] border border-[#333] p-8 rounded-3xl hover:border-[#AFC02B]/50 hover:bg-[#2F2F2F] transition-all duration-300 group"
              >
                <div className="w-14 h-14 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-6 text-[#AFC02B] group-hover:scale-110 transition-transform duration-300 border border-[#333]">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#262626] border border-[#333] rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#AFC02B]/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#AFC02B]/5 rounded-full blur-[100px]" />

            <h2 className="text-4xl md:text-6xl font-bold mb-8 relative z-10">
              지금 바로 <span className="text-[#AFC02B]">SyncNapse</span>와<br />
              함께하세요
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto relative z-10">
              복잡한 설정 없이 바로 시작할 수 있습니다.<br />
              새로운 학습 경험이 당신을 기다립니다.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-10 py-5 bg-[#AFC02B] hover:bg-[#c2d43b] text-black text-xl font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-[#AFC02B]/20 hover:scale-105 relative z-10"
            >
              무료로 시작하기
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="relative w-8 h-8">
              <Image
                src="/대시보드/Logo.svg"
                alt="SyncNapse"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              SyncNapse
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            &copy; 2025 SyncNapse. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
