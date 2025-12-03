import { DashboardProvider } from "@/providers/dashboard-context";
import { DashboardLayoutContent } from "@/components/dashboard/dashboard-layout-content";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}
