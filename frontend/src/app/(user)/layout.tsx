import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  // 올바른 쿠키 키 사용
  const authToken = cookieStore.get("syncnapse_access_token")?.value;

  if (!authToken) {
    redirect("/");
  }

  return <>{children}</>;
}
