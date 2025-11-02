/**
 * Dashboard Main Content - Client Component
 * Handles dashboard context and renders main view sections
 */

"use client";

import { RecentUsedSection } from "@/components/dashboard/main-view/recent-used-section";
import { FolderStructureSection } from "@/components/dashboard/main-view/folder-structure-section";
import { useDashboardContext } from "@/providers/dashboard-context";

export function DashboardMainContent() {
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();

  return (
    <>
      {/* 최근 사용 섹션 */}
      <RecentUsedSection />

      {/* 폴더 구조 섹션 */}
      <FolderStructureSection
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
      />
    </>
  );
}
