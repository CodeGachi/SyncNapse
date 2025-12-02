"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { useDashboardContext } from "@/providers/dashboard-context";
import { useSearchSync } from "@/features/search/use-search-sync";

export function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();

  // 검색 데이터 동기화 (대시보드 진입 시)
  useSearchSync();

  return (
    <div className="flex h-screen bg-background-deep">
      <Sidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      {children}
    </div>
  );
}
