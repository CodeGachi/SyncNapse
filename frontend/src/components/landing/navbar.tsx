import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/common/logo";

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#1a1a1a]/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo width={36} height={36} />
          <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#AFC02B] transition-colors">
            SyncNapse
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>로그인</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
