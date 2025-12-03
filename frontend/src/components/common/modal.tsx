"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  // Custom style options
  overlayClassName?: string;
  containerClassName?: string;
  contentClassName?: string;
  closeButton?: boolean;
  overlayStyle?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  overlayClassName = "fixed inset-0 bg-black/40 backdrop-blur-sm z-40",
  containerClassName = "fixed inset-0 z-50 flex items-center justify-center p-4",
  contentClassName = "bg-background-modal/90 border border-border-subtle shadow-2xl shadow-black/50 backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto",
  closeButton = true,
  overlayStyle,
  contentStyle,
}: ModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && typeof onClose === "function") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent scrolling
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={overlayClassName}
            style={overlayStyle}
            onClick={onClose}
          />

          {/* Modal content */}
          <div className={containerClassName} style={{ pointerEvents: "none" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
              className={cn(contentClassName)}
              style={{ ...contentStyle, pointerEvents: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-6 border-b border-border-subtle w-full">
                  <h2 className="text-xl font-bold text-foreground">{title}</h2>
                  {closeButton && (
                    <button
                      onClick={onClose}
                      className="text-foreground-tertiary hover:text-foreground transition-colors"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className={title ? "p-6" : "p-0"}>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
