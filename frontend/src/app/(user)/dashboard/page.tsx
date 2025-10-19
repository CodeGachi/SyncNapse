import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { TagSection } from "@/components/dashboard/tag-section";
import { FolderSection } from "@/components/dashboard/folder-section";
import { RecentSection } from "@/components/dashboard/recent-section";

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-[#1E1E1E]">
      <DashboardSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <TagSection />
        <FolderSection />
        <RecentSection />
      </main>
    </div>
  );
}
