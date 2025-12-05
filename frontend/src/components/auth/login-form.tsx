"use client";

import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { LoadingScreen } from "@/components/common/loading-screen";
import { motion } from "framer-motion";
import { Logo } from "@/components/common/logo";
import { useLoginForm } from "@/features/auth/use-login-form";

export function LoginForm() {
  const { isAuthenticated, loading } = useLoginForm();

  // 인증 확인 중 로딩 표시
  if (loading) {
    return <LoadingScreen fullScreen message="로딩 중..." />;
  }

  // 미인증 상태면 로그인 페이지 표시
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background-modal relative overflow-hidden p-6">
        {/* 배경 효과 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/3 rounded-full blur-[120px]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/3 rounded-full blur-[120px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md w-full relative z-10"
        >
          <div className="bg-background-surface/80 backdrop-blur-2xl border border-border rounded-[2.5rem] p-12 shadow-2xl space-y-12 text-center relative overflow-hidden group">
            {/* 글로시 효과 */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="space-y-6 relative z-10 flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex items-center gap-4 mb-2"
              >
                <Logo
                  width={64}
                  height={64}
                  className="drop-shadow-[0_0_15px_rgba(175,192,43,0.3)]"
                />
                <h1 className="text-5xl font-bold text-foreground tracking-tight">
                  SyncNapse
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-2"
              >
                <p className="text-foreground-secondary text-lg font-light leading-relaxed">
                  스마트한 필기 서비스로<br />
                  <span className="text-foreground font-medium">학습의 효율</span>을 극대화하세요
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="relative z-10"
            >
              <div className="p-1">
                <GoogleLoginButton />
              </div>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center text-foreground-tertiary text-xs mt-8"
          >
            &copy; 2025 SyncNapse. All rights reserved.
          </motion.p>
        </motion.div>
      </main>
    );
  }

  return null;
}
