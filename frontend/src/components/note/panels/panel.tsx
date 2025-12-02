/**
 * 패널 컴포넌트
 *
 * 모든 패널의 공통 스타일을 제공하는 기본 패널
 * 세로 full height 지원, X 버튼 내장
 */

"use client";

interface PanelProps {
  isOpen: boolean;
  children: React.ReactNode;
  borderColor?: "gray" | "green";
  height?: string;
  onClose?: () => void;
  title?: string;
}

export function Panel({
  isOpen,
  children,
  borderColor = "gray",
  height,
  onClose,
  title,
}: PanelProps) {
  if (!isOpen) return null;

  const borderClass =
    borderColor === "green" ? "border-brand" : "border-[#9ca3af] dark:border-border";

  const heightClass = height ? height : "h-full";

  return (
    <div
      className={`bg-[#f5f5f5] dark:bg-background-elevated border-2 ${borderClass} rounded-lg flex flex-col overflow-hidden transition-all duration-300 ${heightClass}`}
    >
      {/* Header with title and close button */}
      {(title || onClose) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d1d5db] dark:border-border flex-shrink-0">
          {title && <h3 className="text-foreground text-sm font-bold">{title}</h3>}
          {!title && <div />}
          {onClose && (
            <button
              onClick={onClose}
              className="text-foreground-tertiary hover:text-foreground transition-colors"
              title="닫기"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
