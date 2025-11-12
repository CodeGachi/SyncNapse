'use client';

import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/lib/api/transcription.api';
import { getSessionById as getLocalSession } from '@/lib/storage/transcription-storage';
import { LinkedTranscriptPlayer } from '@/components/transcription/linked-transcript-player';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const [localAudioBlob, setLocalAudioBlob] = useState<Blob | null>(null);
  
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['transcription-session', params.id],
    queryFn: () => getSession(params.id),
  });

  // Try to get local audio blob from IndexedDB
  useEffect(() => {
    async function loadLocalAudio() {
      try {
        console.log('[SessionDetailPage] 🔍 Checking IndexedDB for local audio blob...');
        const localData = await getLocalSession(params.id);
        if (localData.fullAudioBlob) {
          console.log('[SessionDetailPage] ✅ Found local audio blob:', {
            size: localData.fullAudioBlob.size,
            type: localData.fullAudioBlob.type,
          });
          setLocalAudioBlob(localData.fullAudioBlob);
        } else {
          console.log('[SessionDetailPage] ⚠️ No local audio blob found');
        }
      } catch (err) {
        console.error('[SessionDetailPage] ❌ Failed to load local audio:', err);
      }
    }
    
    loadLocalAudio();
  }, [params.id]);

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

  const transcripts = session.segments?.map((segment: any) => ({
    id: segment.id,
    text: segment.text,
    startTime: typeof segment.startTime === 'number' ? segment.startTime : Number(segment.startTime),
    endTime: typeof segment.endTime === 'number' ? segment.endTime : Number(segment.endTime),
    confidence: segment.confidence,
    isPartial: segment.isPartial || false,
    language: segment.language || 'ko',
    words: segment.words?.map((word: any) => ({
      word: word.word,
      startTime: typeof word.startTime === 'number' ? word.startTime : Number(word.startTime),
      confidence: typeof word.confidence === 'number' ? word.confidence : Number(word.confidence),
      wordIndex: word.wordIndex,
    })) || [],
  })) || [];

  // Prefer local blob (instant playback), fallback to backend API
  const audioUrl = localAudioBlob ? undefined : `/api/transcription/sessions/${session.id}/audio`;

  console.log('[SessionDetailPage] 🔍 Debug session data:', {
    sessionId: session.id,
    hasLocalBlob: !!localAudioBlob,
    localBlobSize: localAudioBlob?.size,
    audioUrl: audioUrl,
    transcriptsCount: transcripts.length,
    segmentsCount: session.segments?.length || 0,
    wordsCount: transcripts.reduce((sum, t) => sum + (t.words?.length || 0), 0),
    firstSegmentWords: transcripts[0]?.words || [],
  });

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

        {transcripts.length > 0 ? (
          <LinkedTranscriptPlayer
            audioBlob={localAudioBlob || undefined}
            audioUrl={audioUrl}
            transcripts={transcripts}
            className="mb-8"
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">이 세션에는 아직 자막이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
