/**
 * Auth Loading Component
 * Loading state for authentication processes
 */

export function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          로그인 처리 중...
        </h2>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}
