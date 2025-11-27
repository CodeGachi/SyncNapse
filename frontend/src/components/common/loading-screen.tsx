"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Spinner } from "./spinner";

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
    className?: string;
}

export function LoadingScreen({
    message = "로딩 중...",
    fullScreen = false,
    className
}: LoadingScreenProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-4",
                fullScreen ? "fixed inset-0 z-50 bg-[#121212]" : "w-full h-full min-h-[200px]",
                className
            )}
        >
            <Spinner />

            {message && (
                <motion.p
                    className="text-sm font-medium text-gray-400"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {message}
                </motion.p>
            )}
        </div>
    );
}
