"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HeroSection() {
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
