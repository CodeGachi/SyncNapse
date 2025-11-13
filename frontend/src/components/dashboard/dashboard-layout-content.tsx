"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar/dashboard-sidebar";
import { useDashboardContext } from "@/providers/dashboard-context";

export function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();

  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      <DashboardSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      {children}
    </div>
  );
}
