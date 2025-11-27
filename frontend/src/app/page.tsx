"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoadingScreen } from "@/components/common/loading-screen";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Mic, FileText, PenTool, Zap, Shield, Smartphone, ChevronRight, Play, Layers, Sparkles, FolderOpen, StickyNote, Image as ImageIcon, Folder, Link2, Database, LogIn } from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard/main");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <LoadingScreen fullScreen message="로딩 중..." />;
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] text-white selection:bg-[#AFC02B] selection:text-black font-sans overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <BentoGridSection />

      <Footer />
    </main>
  );
}

function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9">
            <Image
              src="/대시보드/Logo.svg"
              alt="SyncNapse"
              fill
              className="object-contain"
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#AFC02B] transition-colors">
            SyncNapse
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>로그인</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#AFC02B]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            지식이,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">동기화되다.</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed"
        >
          듣고, 기록하고, 연결하는 실시간 학습 워크스페이스.<br />
          복잡함은 덜어내고, 학습의 본질에만 집중하세요.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center gap-4 pt-4"
        >
          <Link
            href="/login"
            className="px-8 py-3 bg-[#9db026] text-black text-sm font-bold rounded-full hover:bg-[#AFC02B] transition-colors shadow-[0_0_20px_rgba(157,176,38,0.2)] hover:shadow-[0_0_20px_rgba(175,192,43,0.4)]"
          >
            무료로 시작하기
          </Link>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="pt-16 relative"
        >
          <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0a] aspect-[16/9] max-w-4xl mx-auto">
            {/* Mockup Header */}
            <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#111]">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#333]" />
                  <div className="w-3 h-3 rounded-full bg-[#333]" />
                  <div className="w-3 h-3 rounded-full bg-[#333]" />
                </div>
                <div className="h-4 w-32 bg-[#222] rounded-full hidden sm:block" />
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-[#222]" />
                <div className="w-6 h-6 rounded-full bg-[#222]" />
              </div>
            </div>
            {/* Mockup Body */}
            <div className="flex h-full">
              {/* Main Content (Player) */}
              <div className="flex-1 p-8 bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden group">
                <div className="w-full max-w-md aspect-video rounded-xl bg-[#111] border border-white/10 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#AFC02B]/5 to-transparent opacity-50" />
                  <div className="flex gap-1 h-12 items-center relative z-10">
                    {[...Array(16)].map((_, i) => (
                      <div key={i} className="w-1.5 bg-[#AFC02B] rounded-full animate-pulse" style={{ height: Math.random() * 100 + '%', animationDelay: i * 0.05 + 's' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel (Script) */}
              <div className="w-64 border-l border-white/5 bg-[#111] hidden md:flex flex-col">
                {/* Panel Header */}
                <div className="h-10 border-b border-white/5 flex items-center justify-between px-4">
                  <div className="h-3 w-16 bg-[#333] rounded-full" />
                  <div className="w-8 h-4 bg-[#222] rounded-full" />
                </div>
                {/* Panel Content */}
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-[#222] rounded-full" />
                    <div className="h-2 w-full bg-[#222] rounded-full" />
                    <div className="h-2 w-3/4 bg-[#222] rounded-full" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-2 w-full bg-[#222] rounded-full" />
                    <div className="h-2 w-full bg-[#222] rounded-full" />
                    <div className="h-2 w-full bg-[#222] rounded-full" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-2 w-full bg-[#222] rounded-full" />
                    <div className="h-2 w-2/3 bg-[#222] rounded-full" />
                  </div>
                </div>
              </div>

              {/* Far Right Sidebar (Nav) */}
              <div className="w-16 border-l border-white/5 bg-[#0f0f0f] hidden sm:flex flex-col items-center py-4 gap-4">
                <div className="w-10 h-10 rounded-full bg-[#222] border border-white/5" />
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/5" />
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/5" />
                <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-white/5" />
                <div className="mt-auto w-8 h-8 rounded-full bg-[#222]" />
              </div>
            </div>
          </div>
          {/* Bottom Fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}

function BentoGridSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">

          {/* Small Card 1: Integrated Management */}
          <SpotlightCard className="md:col-span-2">
            <motion.div
              className="h-full p-8 flex flex-col justify-between relative overflow-hidden"
              initial="idle"
              whileHover="hover"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#AFC02B] mb-4">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold mb-2">모든 자료를 한곳에</h3>
                <p className="text-gray-400 text-sm max-w-sm">
                  PDF, 녹음, 스크립트, 메모를 한 화면에서 관리하세요. 더 이상 여러 앱을 오갈 필요가 없습니다.
                </p>
              </div>
              {/* Visual */}
              <div className="absolute right-0 bottom-0 w-full h-full overflow-hidden pointer-events-none">
                {/* Central Glow */}
                <div className="absolute right-10 bottom-10 w-32 h-32 bg-[#AFC02B]/10 blur-[50px] rounded-full" />

                {/* Floating Icons Cloud */}
                <div className="absolute right-4 bottom-4 w-64 h-64 opacity-30">
                  {/* Icon 1: FileText (Main) */}
                  <motion.div
                    className="absolute top-1/4 left-1/4 text-[#AFC02B]"
                    variants={{
                      idle: { y: 0, rotate: -10, scale: 1 },
                      hover: { y: -15, rotate: -20, scale: 1.1, transition: { duration: 3, repeat: Infinity, repeatType: "reverse" } }
                    }}
                  >
                    <FileText className="w-14 h-14" />
                  </motion.div>

                  {/* Icon 2: Mic */}
                  <motion.div
                    className="absolute bottom-1/4 right-1/4 text-white"
                    variants={{
                      idle: { y: 0, rotate: 10, scale: 1 },
                      hover: { y: -20, rotate: 5, scale: 1.1, transition: { duration: 4, repeat: Infinity, repeatType: "reverse", delay: 0.5 } }
                    }}
                  >
                    <Mic className="w-12 h-12" />
                  </motion.div>

                  {/* Icon 3: Note */}
                  <motion.div
                    className="absolute top-1/3 right-1/3 text-gray-400"
                    variants={{
                      idle: { y: 0, rotate: 5 },
                      hover: { y: -10, rotate: 15, transition: { duration: 3.5, repeat: Infinity, repeatType: "reverse", delay: 1 } }
                    }}
                  >
                    <StickyNote className="w-10 h-10" />
                  </motion.div>

                  {/* Icon 4: Image */}
                  <motion.div
                    className="absolute bottom-1/3 left-1/3 text-gray-500"
                    variants={{
                      idle: { x: 0, y: 0, rotate: -5 },
                      hover: { x: -10, y: -10, rotate: -15, transition: { duration: 4.5, repeat: Infinity, repeatType: "reverse", delay: 1.5 } }
                    }}
                  >
                    <ImageIcon className="w-8 h-8" />
                  </motion.div>

                  {/* Icon 5: Folder */}
                  <motion.div
                    className="absolute top-10 right-10 text-[#AFC02B]/60"
                    variants={{
                      idle: { scale: 0.8, rotate: 15 },
                      hover: { scale: 1, rotate: 0, transition: { duration: 5, repeat: Infinity, repeatType: "reverse", delay: 2 } }
                    }}
                  >
                    <Folder className="w-6 h-6" />
                  </motion.div>

                  {/* Icon 6: Link */}
                  <motion.div
                    className="absolute bottom-10 left-10 text-white/40"
                    variants={{
                      idle: { scale: 0.8, rotate: -15 },
                      hover: { scale: 1, rotate: -5, transition: { duration: 4, repeat: Infinity, repeatType: "reverse", delay: 0.8 } }
                    }}
                  >
                    <Link2 className="w-6 h-6" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </SpotlightCard>

          {/* Card: Transcription */}
          <SpotlightCard>
            <motion.div
              className="h-full p-8 flex flex-col justify-between"
              initial="idle"
              whileHover="hover"
            >
              <div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#AFC02B] mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">AI 실시간 자막</h3>
                <p className="text-gray-400 text-sm">
                  말하는 순간 텍스트로 변환됩니다.
                </p>
              </div>
              <div className="space-y-2 mt-4">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-2 bg-white rounded"
                    style={{ width: i === 1 ? '75%' : '100%' }}
                    variants={{
                      idle: { opacity: 0.3 },
                      hover: {
                        opacity: [0.1, 0.3, 0.1],
                        transition: { duration: 2, repeat: Infinity, delay: i * 0.4 }
                      }
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </SpotlightCard>

          {/* Card: Note */}
          <SpotlightCard>
            <motion.div
              className="h-full p-8 flex flex-col justify-between"
              initial="idle"
              whileHover="hover"
            >
              <div>
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#AFC02B] mb-4">
                  <PenTool className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-2">스마트 노트</h3>
                <p className="text-gray-400 text-sm">
                  필기와 녹음이 타임라인으로 연결됩니다.
                </p>
              </div>
              <div className="flex gap-3 mt-4 relative">
                {/* Timeline Line */}
                <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-white/10 overflow-hidden">
                  <motion.div
                    className="w-full h-1/2 bg-gradient-to-b from-transparent via-[#AFC02B] to-transparent"
                    variants={{
                      idle: { y: -50 },
                      hover: {
                        y: [-50, 100],
                        transition: { duration: 2, repeat: Infinity, ease: "linear" }
                      }
                    }}
                  />
                </div>
                <motion.div
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex-shrink-0 z-10"
                  variants={{
                    idle: { boxShadow: "0 0 0 0px rgba(175,192,43,0)", borderColor: "rgba(255,255,255,0.2)" },
                    hover: {
                      boxShadow: ["0 0 0 0px rgba(175,192,43,0)", "0 0 0 4px rgba(175,192,43,0.1)", "0 0 0 0px rgba(175,192,43,0)"],
                      borderColor: ["rgba(255,255,255,0.2)", "#AFC02B", "rgba(255,255,255,0.2)"],
                      transition: { duration: 2, repeat: Infinity }
                    }
                  }}
                />
                <div className="flex-1 space-y-2 pt-1 opacity-40">
                  <div className="h-2 w-full bg-white rounded" />
                  <div className="h-2 w-2/3 bg-white rounded" />
                </div>
              </div>
            </motion.div>
          </SpotlightCard>

          {/* Large Card: AI Chatbot */}
          <SpotlightCard className="md:col-span-2">
            <motion.div
              className="h-full p-8 flex flex-col justify-between relative overflow-hidden"
              initial="idle"
              whileHover="hover"
            >
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[#AFC02B] mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-bold mb-2">AI 학습 비서</h3>
                <p className="text-gray-400 text-sm max-w-sm">
                  궁금한 점은 바로 질문하세요. AI가 강의 내용을 분석하여 즉시 답변하고 요약해줍니다.
                </p>
              </div>
              {/* Visual */}
              <div className="absolute right-8 bottom-8 w-64 flex flex-col gap-3 opacity-50">
                {/* User Message */}
                <motion.div
                  className="self-end bg-white/10 rounded-2xl rounded-tr-sm px-4 py-2 text-xs text-right"
                  variants={{
                    idle: { y: 0, opacity: 0.5 },
                    hover: {
                      y: [0, -5, 0],
                      opacity: 1,
                      transition: { duration: 2, repeat: Infinity, delay: 0 }
                    }
                  }}
                >
                  <div className="w-24 h-2 bg-white/50 rounded-full ml-auto" />
                </motion.div>
                {/* AI Message */}
                <motion.div
                  className="self-start bg-[#AFC02B]/20 border border-[#AFC02B]/30 rounded-2xl rounded-tl-sm px-4 py-3 text-xs"
                  variants={{
                    idle: { y: 0, opacity: 0.5 },
                    hover: {
                      y: [0, -5, 0],
                      opacity: 1,
                      borderColor: "rgba(175,192,43,0.8)",
                      transition: { duration: 2, repeat: Infinity, delay: 1 }
                    }
                  }}
                >
                  <div className="space-y-1.5">
                    <div className="w-32 h-2 bg-[#AFC02B]/50 rounded-full" />
                    <div className="w-24 h-2 bg-[#AFC02B]/30 rounded-full" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </SpotlightCard>

        </div >
      </div >
    </section >
  );
}



function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5 bg-[#1a1a1a]">
      <div className="max-w-5xl mx-auto flex justify-between items-center text-gray-500 text-sm">
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5 opacity-50">
            <Image
              src="/대시보드/Logo.svg"
              alt="SyncNapse"
              fill
              className="object-contain"
            />
          </div>
          <span>&copy; 2025 SyncNapse.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
      </div>
    </footer>
  );
}

// --- Components ---

function SpotlightCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative border border-[#333] bg-[#262626]/80 backdrop-blur-xl rounded-2xl overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(175, 192, 43, 0.1),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
