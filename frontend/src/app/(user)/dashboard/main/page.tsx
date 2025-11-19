"use client";

import { NewMainContent } from "@/components/dashboard/new-main-content";
import { useDashboardContext } from "@/providers/dashboard-context";

export default function DashboardPage() {
  const { selectedFolderId } = useDashboardContext();

  return <NewMainContent selectedFolderId={selectedFolderId} />;
}
