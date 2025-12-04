import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import { AdminLayout } from "@/components/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin - SyncNapse",
  description: "SyncNapse 관리자 콘솔",
};

const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  colors: {
    dark: [
      "#C1C2C5",
      "#A6A7AB",
      "#909296",
      "#5c5f66",
      "#373A40",
      "#2C2E33",
      "#25262b",
      "#1A1B1E",
      "#141517",
      "#101113",
    ],
  },
});

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AdminLayout>{children}</AdminLayout>
    </MantineProvider>
  );
}
