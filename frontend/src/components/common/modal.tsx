"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  // 커스텀 스타일 옵션
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
  overlayClassName = "fixed inset-0 bg-black/50 z-40 transition-opacity",
  containerClassName = "fixed inset-0 z-50 flex items-center justify-center p-4",
  contentClassName = "bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all",
  closeButton = true,
  overlayStyle,
  contentStyle,
}: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // 스크롤 방지
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div className={overlayClassName} style={overlayStyle} onClick={onClose} />

      {/* 모달 콘텐츠 */}
      <div className={containerClassName}>
        <div className={cn(contentClassName)} style={contentStyle} onClick={(e) => e.stopPropagation()}>
          {/* 헤더 */}
          {title && (
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              {closeButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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

          {/* 본문 */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
}
