/**
 * New Dashboard Layout - Figma Design
 * 피그마 디자인 기반 새로운 대시보드 레이아웃
 */

"use client";

import { NewSidebar } from "@/components/dashboard/new-sidebar";
import { useDashboardContext } from "@/providers/dashboard-context";

export function NewDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();

  return (
    <div className="flex h-screen bg-[#262626]">
      <NewSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      {children}
    </div>
  );
}
