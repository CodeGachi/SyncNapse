"use client";

import { useEffect } from "react";
import { NewMainContent } from "@/components/dashboard/new-main-content";
import { useDashboardContext } from "@/providers/dashboard-context";
import { useFolders } from "@/features/dashboard";

export default function DashboardPage() {
  const { selectedFolderId, setSelectedFolderId } = useDashboardContext();
  const { folders, isLoading } = useFolders();

  // Auto-select Root folder on first visit
  useEffect(() => {
    if (!isLoading && selectedFolderId === null && folders.length > 0) {
      const rootFolder = folders.find(f => f.name === "Root" && f.parentId === null);
      if (rootFolder) {
        console.log('[DashboardPage] Auto-selecting Root folder:', rootFolder.id);
        setSelectedFolderId(rootFolder.id);
      }
    }
  }, [isLoading, selectedFolderId, folders, setSelectedFolderId]);

  return <NewMainContent selectedFolderId={selectedFolderId} />;
}
