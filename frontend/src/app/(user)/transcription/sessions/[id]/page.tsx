'use client';

import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/lib/api/transcription.api';
import { LinkedTranscriptPlayer } from '@/components/transcription/linked-transcript-player';
import Link from 'next/link';

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['transcription-session', params.id],
    queryFn: () => getSession(params.id),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">세션을 불러올 수 없습니다</p>
            <Link href="/transcription/sessions" className="text-blue-600 hover:underline mt-2 inline-block">
              ← 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const firstChunk = session.audioChunks?.[0];
  const audioUrl = firstChunk?.audioUrl;

  const transcripts = session.segments?.map((segment: any) => ({
    id: segment.id,
    text: segment.text,
    startTime: typeof segment.startTime === 'number' ? segment.startTime : Number(segment.startTime),
    endTime: typeof segment.endTime === 'number' ? segment.endTime : Number(segment.endTime),
    confidence: segment.confidence,
    isPartial: segment.isPartial || false,
    language: segment.language || 'ko',
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/transcription/sessions"
            className="text-blue-600 hover:underline mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            목록으로 돌아가기
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
            {session.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>📅 {new Date(session.createdAt).toLocaleString('ko-KR')}</span>
            <span>•</span>
            <span>⏱️ {Math.floor((session.duration || 0) / 60)}분 {Math.floor((session.duration || 0) % 60)}초</span>
            <span>•</span>
            <span>📝 {transcripts.length}개 자막</span>
          </div>
        </div>

        {audioUrl && transcripts.length > 0 ? (
          <LinkedTranscriptPlayer
            audioUrl={audioUrl}
            transcripts={transcripts}
            className="mb-8"
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">이 세션에는 아직 녹음 또는 자막이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
