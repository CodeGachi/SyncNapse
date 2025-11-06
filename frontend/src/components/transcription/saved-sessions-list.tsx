'use client';

import { useQuery } from '@tanstack/react-query';
import { getSessions as getSessionsFromAPI } from '@/lib/api/transcription.api';
import { getSessions as getSessionsFromLocal } from '@/lib/storage/transcription-storage';
import Link from 'next/link';

export function SavedSessionsList() {
  const {
    data: sessions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transcription-sessions'],
    queryFn: async () => {
      try {
        const backendSessions = await getSessionsFromAPI();
        console.log('[SavedSessionsList] ✅ Loaded from backend:', backendSessions.length, 'sessions');
        
        for (const session of backendSessions) {
        }
        
        return backendSessions;
      } catch (error) {
        console.warn('[SavedSessionsList] ❌ Failed to load from backend, trying local cache:', error);
        
        try {
          const localSessions = await getSessionsFromLocal();
          console.log('[SavedSessionsList] ⚠️ Using local cache:', localSessions.length, 'sessions');
          return localSessions;
        } catch (localError) {
          console.error('[SavedSessionsList] ❌ No sessions available');
          return [];
        }
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">
          오류: {(error as Error).message}
        </p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-lg">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <p className="text-gray-600 text-lg">저장된 녹음이 없습니다</p>
        <p className="text-gray-500 text-sm mt-2">
          새 녹음을 시작하여 자막을 생성하세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">저장된 녹음 목록</h2>
      
      <div className="grid gap-4">
        {sessions.map((session) => {
          const duration = Number(session.duration) || 0;
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          
          return (
            <Link
              key={session.id}
              href={`/transcription/sessions/${session.id}`}
              className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {session.title || '제목 없음'}
                  </h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>
                      📅 {new Date(session.createdAt).toLocaleString('ko-KR')}
                    </span>
                    
                    {duration > 0 && (
                      <span>
                        ⏱️ {minutes}분 {seconds}초
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center space-x-3 text-xs text-gray-400">
                    {(session as any)._count && (
                      <>
                        <span>
                          🎵 {(session as any)._count.audioChunks}개 오디오 청크
                        </span>
                        <span>
                          💬 {(session as any)._count.segments}개 자막
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {((session as any).status === 'recording' || !(session as any).endTime) ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      진행 중
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      완료
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
