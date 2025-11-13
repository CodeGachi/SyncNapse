import { SavedSessionsList } from '@/components/transcription';
import Link from 'next/link';

export default function SessionsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📚 녹음 관리
            </h1>
            <p className="text-gray-600">
              저장된 녹음과 자막을 확인하세요
            </p>
          </div>

          <Link
            href="/transcription"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            ➕ 새 녹음 시작
          </Link>
        </div>

        <SavedSessionsList />
      </div>
    </div>
  );
}
