"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = true, className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-foreground/5 transition-all duration-200 group ${className}`}
    >
      <div className="relative w-5 h-5">
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.svg
              key="moon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 opacity-70 group-hover:opacity-100"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <motion.path
                d="M17.5 10.6333C17.3687 12.0304 16.8459 13.3613 16.0002 14.4723C15.1544 15.5833 14.0203 16.4305 12.7271 16.918C11.4339 17.4054 10.0324 17.5142 8.67994 17.2319C7.32752 16.9497 6.07711 16.2876 5.07142 15.3219C4.06572 14.3561 3.34628 13.1253 2.99508 11.7701C2.64387 10.4149 2.67505 8.99006 3.08507 7.65289C3.49509 6.31573 4.26765 5.11976 5.31589 4.19913C6.36412 3.2785 7.64627 2.67131 9.01667 2.44167C8.19485 3.62711 7.8285 5.06884 7.98616 6.50301C8.14382 7.93718 8.81519 9.26766 9.87545 10.2622C10.9357 11.2567 12.3135 11.8493 13.7619 11.9322C15.2102 12.0152 16.6402 11.5838 17.8 10.7167"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="sun"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute inset-0 opacity-70 group-hover:opacity-100"
              initial={{ rotate: 90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <motion.circle
                cx="10"
                cy="10"
                r="4"
                stroke="currentColor"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.2 }}
              />
              {/* 햇살 - 순차적 애니메이션 */}
              {[
                { d: "M10 2V4", delay: 0.15 },
                { d: "M10 16V18", delay: 0.2 },
                { d: "M2 10H4", delay: 0.25 },
                { d: "M16 10H18", delay: 0.3 },
                { d: "M4.22 4.22L5.64 5.64", delay: 0.35 },
                { d: "M14.36 14.36L15.78 15.78", delay: 0.4 },
                { d: "M4.22 15.78L5.64 14.36", delay: 0.45 },
                { d: "M14.36 5.64L15.78 4.22", delay: 0.5 },
              ].map((ray, i) => (
                <motion.path
                  key={i}
                  d={ray.d}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: ray.delay, duration: 0.15 }}
                />
              ))}
            </motion.svg>
          )}
        </AnimatePresence>
      </div>
      {showLabel && (
        <motion.span
          className="text-foreground-secondary group-hover:text-foreground font-medium text-sm leading-[17px] font-['Inter'] transition-colors"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? "다크 모드" : "라이트 모드"}
        </motion.span>
      )}
    </button>
  );
}
