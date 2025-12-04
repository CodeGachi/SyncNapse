"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { useDashboardContext } from "@/providers/dashboard-context";
import { useSearchSync } from "@/features/search/use-search-sync";

export function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 검색 데이터 동기화 (대시보드 진입 시)
  useSearchSync();

  return (
    <div className="flex h-screen bg-background-deep">
      {/* 모바일/태블릿 햄버거 메뉴 버튼 */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="xl:hidden fixed top-4 left-4 z-50 p-2 bg-background-surface/80 backdrop-blur-sm border border-border-subtle rounded-lg hover:bg-background-elevated transition-colors"
        aria-label="메뉴 열기"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* 모바일/태블릿 오버레이 */}
      {isSidebarOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 사이드바 - 데스크탑에서는 항상 표시, 모바일/태블릿에서는 슬라이드 */}
      <div className={`
        fixed xl:relative inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
      `}>
        <Sidebar
          selectedFolderId={selectedFolderId}
          onSelectFolder={(folderId) => {
            setSelectedFolderId(folderId);
            setIsSidebarOpen(false); // 폴더 선택 시 사이드바 닫기
          }}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />
      </div>

      {children}
    </div>
  );
}
