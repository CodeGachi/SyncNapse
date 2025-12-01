import Image from "next/image";

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-white/5 bg-[#1a1a1a]">
      <div className="max-w-5xl mx-auto flex justify-between items-center text-gray-500 text-sm">
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5 opacity-50">
            <Image
              src="/대시보드/Logo.svg"
              alt="SyncNapse"
              fill
              className="object-contain"
            />
          </div>
          <span>&copy; 2025 SyncNapse.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
      </div>
    </footer>
  );
}
