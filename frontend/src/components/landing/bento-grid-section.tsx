"use client";

import { motion } from "framer-motion";
import { Mic, FileText, PenTool, Sparkles, FolderOpen, StickyNote, Image as ImageIcon, Folder, Link2 } from "lucide-react";
import { SpotlightCard } from "./spotlight-card";

export function BentoGridSection() {
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

        </div>
      </div>
    </section>
  );
}
