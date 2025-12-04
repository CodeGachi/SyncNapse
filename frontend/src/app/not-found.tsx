import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] p-4 text-center">
      <div className="bg-[#1a1a1a]/90 backdrop-blur-xl p-8 rounded-3xl border border-[#333] shadow-2xl max-w-md w-full">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-6">
          페이지를 찾을 수 없습니다
        </p>
        <Link
          href="/"
          className="inline-block w-full py-3 px-4 bg-[#AFC02B] hover:bg-[#9aab26] text-black rounded-xl font-medium transition-all"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
