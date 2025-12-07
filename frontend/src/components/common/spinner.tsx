"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SpinnerProps {
    className?: string;
    size?: "xs" | "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md" }: SpinnerProps) {
    const sizeClasses = {
        xs: "w-3 h-3",
        sm: "w-6 h-6",
        md: "w-12 h-12",
        lg: "w-16 h-16",
    };

    return (
        <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
            {/* Outer Ring */}
            <motion.div
                className="absolute inset-0 rounded-full border-2 border-[#9ca3af] dark:border-[#374151]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Spinning Inner Ring */}
            <motion.div
                className="absolute inset-0 rounded-full border-t-2 border-brand"
                animate={{ rotate: 360 }}
                transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

            {/* Inner Dot (Pulse) */}
            <motion.div
                className={cn(
                    "absolute rounded-full bg-brand",
                    size === "xs" ? "w-0.5 h-0.5" : size === "sm" ? "w-1 h-1" : "w-2 h-2"
                )}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </div>
    );
}
