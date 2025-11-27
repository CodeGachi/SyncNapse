"use client";

import { NewSidebar } from "@/components/dashboard/new-sidebar";
import { useDashboardContext } from "@/providers/dashboard-context";

export function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      <NewSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      {children}
    </div>
  );
}
