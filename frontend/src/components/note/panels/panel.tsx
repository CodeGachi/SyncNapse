/**
 * Panel Component
 * 모든 패널의 공통 스타일을 제공하는 기본 패널
 * 색상과 높이는 선택 가능하도록 구성
 */

"use client";

interface PanelProps {
  isOpen: boolean;
  children: React.ReactNode;
  borderColor?: "gray" | "green";
  height?: string;
}

export function Panel({
  isOpen,
  children,
  borderColor = "gray",
  height,
}: PanelProps) {
  if (!isOpen) return null;

  const borderClass =
    borderColor === "green" ? "border-[#AFC02B]" : "border-[#b9b9b9]";

  const heightClass = height ? height : "";

  return (
    <div
      className={`bg-[#2f2f2f] border-2 ${borderClass} rounded-2xl overflow-hidden transition-all duration-500 ease-out ${heightClass}`}
      style={{
        animation: isOpen ? "expandPanel 0.5s ease-out forwards" : "none",
      }}
    >
      {children}
    </div>
  );
}
