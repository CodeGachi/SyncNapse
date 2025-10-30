"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { RecentUsedSection } from "@/components/dashboard/recent-used-section";
import { FolderStructureSection } from "@/components/dashboard/folder-structure-section";

export default function DashboardPage() {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      <DashboardSidebar
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
      <main className="flex-1 overflow-y-auto p-8">
        {/* 최근 사용 섹션 */}
        <RecentUsedSection />

        {/* 폴더 구조 섹션 */}
        <FolderStructureSection
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
        />
      </main>
    </div>
  );
}
