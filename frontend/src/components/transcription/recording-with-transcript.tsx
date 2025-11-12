'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRecordingWithTranscription } from '@/features/transcription/use-recording-with-transcription';
import { YouTubeStyleSubtitle } from './youtube-style-subtitle';
import { LinkedTranscriptPlayer } from './linked-transcript-player';
import { getSession } from '@/lib/api/transcription.api';
import { getSessionById as getLocalSession } from '@/lib/storage/transcription-storage';

const SUPPORTED_LANGUAGES = [
  { code: 'ko-KR', name: '한국어 (Korean)', emoji: '🇰🇷' },
  { code: 'en-US', name: 'English (US)', emoji: '🇺🇸' },
  { code: 'ja-JP', name: '日本語 (Japanese)', emoji: '🇯🇵' },
  { code: 'zh-CN', name: '中文 (Chinese)', emoji: '🇨🇳' },
  { code: 'es-ES', name: 'Español (Spanish)', emoji: '🇪🇸' },
  { code: 'fr-FR', name: 'Français (French)', emoji: '🇫🇷' },
];

export function RecordingWithTranscript() {
  const [title, setTitle] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('ko-KR');
  const [autoDetect, setAutoDetect] = useState(false);

  const {
    isRecording,
    sessionId,
    segments,
    audioLevel,
    startRecording,
    stopRecording,
    clear,
  } = useRecordingWithTranscription();

  const { data: sessionData } = useQuery({
    queryKey: ['transcription-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      try {
        const localData = await getLocalSession(sessionId);
        console.log('[RecordingWithTranscript] ✅ Loaded from LOCAL IndexedDB:', {
          sessionId,
          audioChunks: localData.audioChunks.length,
          segments: localData.segments.length,
          hasBlob: localData.audioChunks[0]?.blob ? 'YES!' : 'NO',
          hasFullAudioBlob: localData.fullAudioBlob ? 'YES!' : 'NO',
          hasFullAudioUrl: localData.fullAudioUrl ? 'YES!' : 'NO',
        });
        
        return {
          ...localData.session,
          audioChunks: localData.audioChunks,
          segments: localData.segments,
          fullAudioBlob: localData.fullAudioBlob,
          fullAudioUrl: localData.fullAudioUrl,
        };
      } catch (localError) {
        console.warn('[RecordingWithTranscript] Local IndexedDB failed, trying backend API:', localError);
        
        const backendData = await getSession(sessionId);
        console.log('[RecordingWithTranscript] Loaded from BACKEND API');
        return backendData;
      }
    },
    enabled: !isRecording && !!sessionId,
    refetchInterval: 5000,
  });

  const handleStart = async () => {
    const recordingTitle = title.trim() || `Recording ${new Date().toLocaleString('ko-KR')}`;
    
    try {
      await startRecording(recordingTitle, {
        language: selectedLanguage,
        autoDetectLanguage: autoDetect,
      });
      setShowTitleInput(false);
    } catch (error) {
      console.error('[RecordingWithTranscript] Start failed:', error);
      alert('녹음 시작 실패: ' + (error as Error).message);
    }
  };

  const handleStop = async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('[RecordingWithTranscript] Stop failed:', error);
      alert('녹음 중지 실패: ' + (error as Error).message);
    }
  };

  const handleClear = () => {
    if (confirm('녹음을 초기화하시겠습니까?')) {
      clear();
      setTitle('');
      setShowTitleInput(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-4xl font-bold text-white mb-2">
          🎙️ 실시간 자막 녹음
        </h1>
        <p className="text-blue-200">
          녹음과 동시에 자막이 생성되고 자동으로 저장됩니다
        </p>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          {!isRecording && !sessionId && (
            <>
              {showTitleInput ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      녹음 제목 (선택사항)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: 영어 수업 2025-01-15"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🌐 언어 설정
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      disabled={autoDetect}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.emoji} {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoDetect"
                      checked={autoDetect}
                      onChange={(e) => setAutoDetect(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoDetect" className="text-sm text-gray-700 cursor-pointer">
                      ✨ 자동 언어 감지 (실험적 기능)
                    </label>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleStart}
                      className="flex-1 bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg"
                    >
                      🔴 녹음 시작
                    </button>
                    <button
                      onClick={() => setShowTitleInput(false)}
                      className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowTitleInput(true)}
                  className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                >
                  ➕ 새 녹음 시작
                </button>
              )}
            </>
          )}

          {isRecording && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-lg font-semibold text-gray-800">
                    녹음 중...
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">음량:</span>
                  <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${audioLevel * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {sessionId && (
                <p className="text-sm text-gray-500">
                  세션 ID: {sessionId.slice(0, 8)}...
                </p>
              )}

              <button
                onClick={handleStop}
                className="w-full bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg"
              >
                ⏹️ 녹음 중지
              </button>
            </div>
          )}

          {!isRecording && sessionId && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold">녹음 완료 및 저장됨</span>
              </div>

              <p className="text-sm text-gray-600">
                자막 {segments.filter((s) => !s.isPartial).length}개가 생성되었습니다.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.href = `/transcription/sessions/${sessionId}`}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  📄 자막 보기
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  🗑️ 초기화
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="max-w-4xl mx-auto">
          <YouTubeStyleSubtitle
            segments={segments}
            maxVisibleSegments={3}
            className="rounded-xl overflow-hidden shadow-2xl"
          />
        </div>
      )}

      {!isRecording && sessionId && sessionData && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Check for both full audio (new format) and audio chunks (legacy format) */}
          {((sessionData as any).fullAudioBlob || (sessionData as any).fullAudioUrl || (sessionData.audioChunks && sessionData.audioChunks.length > 0)) ? (
            <>
              <div className="bg-white rounded-xl shadow-2xl p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  🎵 녹음 재생
                  <span className="text-sm font-normal text-gray-500">
                    (자막 단어 클릭 시 해당 위치부터 끝까지 재생)
                  </span>
                </h2>
              </div>

              <LinkedTranscriptPlayer
                // Prefer full audio (new format) over chunks (legacy format)
                audioBlob={(sessionData as any).fullAudioBlob || (sessionData.audioChunks?.[0] as any)?.blob}
                audioUrl={(sessionData as any).fullAudioUrl || (sessionData.audioChunks?.[0] as any)?.audioUrl}
                transcripts={(sessionData.segments || []).map((seg: any) => ({
                  id: seg.id,
                  text: seg.text,
                  startTime: typeof seg.startTime === 'number' ? seg.startTime : Number(seg.startTime),
                  endTime: typeof seg.endTime === 'number' ? seg.endTime : Number(seg.endTime),
                  confidence: seg.confidence,
                  isPartial: seg.isPartial || false,
                  language: seg.language || 'ko',
                }))}
                className="mb-8"
              />
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl p-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">
                  오디오 파일 처리 중... ({sessionData.segments?.length || 0}개 자막 저장됨)
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  잠시 후 자동으로 업데이트됩니다
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {!isRecording && sessionId && !sessionData && segments.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">녹음된 자막 미리보기</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {segments
                .filter((s) => !s.isPartial)
                .map((segment, index) => (
                  <div
                    key={segment.id}
                    className="p-3 bg-gray-50 rounded-lg"
                    translate="yes"
                  >
                    <span className="text-xs text-gray-500 mr-2">
                      #{index + 1}
                    </span>
                    <span className="text-gray-800">{segment.text}</span>
                  </div>
                ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <span className="text-sm">오디오 파일 처리 중...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
