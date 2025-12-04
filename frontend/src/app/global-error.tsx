"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] p-4 text-center">
          <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-[#333] shadow-2xl max-w-md w-full">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              오류가 발생했습니다
            </h1>
            <p className="text-gray-400 mb-6">
              예상치 못한 문제가 발생했습니다. 다시 시도해주세요.
            </p>
            <button
              onClick={() => reset()}
              className="inline-block w-full py-3 px-4 bg-[#AFC02B] hover:bg-[#9aab26] text-black rounded-xl font-medium transition-all"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
