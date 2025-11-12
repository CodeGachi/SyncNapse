'use client';

import { useState, useEffect } from 'react';
import { useDevicePairing } from '@/features/devices';
import { AudioSender } from '@/lib/webrtc';
import { useAuth } from '@/features/auth/use-auth';

export function AudioStreamSender() {
  const { user } = useAuth();
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [audioSender, setAudioSender] = useState<AudioSender | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);

  const {
    signalingClient,
    isConnected,
    availableDevices,
    isPaired,
    pairedDeviceId,
    pairedSocketId,
    requestPairing,
    clearPairing,
  } = useDevicePairing(user?.id || '', currentDeviceId || '');

  useEffect(() => {
    const deviceId = localStorage.getItem('syncnapse_device_id');
    setCurrentDeviceId(deviceId);
  }, []);

  useEffect(() => {
    if (isPaired && pairedSocketId && signalingClient && !audioSender) {
      startStreaming();
    }
  }, [isPaired, pairedSocketId, signalingClient]);

  const startStreaming = async () => {
    if (!signalingClient || !pairedDeviceId) return;

    try {
      const sender = new AudioSender({
        signalingClient,
        targetDeviceId: pairedDeviceId,
        onConnectionStateChange: (state) => {
          console.log('[AudioStreamSender] Connection state:', state);
          setConnectionState(state);
          if (state === 'connected') {
            setIsStreaming(true);
          }
        },
      });

      await sender.start();
      
      if (pairedSocketId) {
        await sender.handlePairingAccepted(pairedSocketId);
      }

      setAudioSender(sender);
    } catch (error) {
      console.error('[AudioStreamSender] Start streaming failed:', error);
      alert('오디오 스트리밍 시작 실패: ' + (error as Error).message);
    }
  };

  const stopStreaming = () => {
    if (audioSender) {
      audioSender.stop();
      setAudioSender(null);
    }
    setIsStreaming(false);
    setConnectionState(null);
    clearPairing();
  };

  const handleConnectDevice = () => {
    if (!selectedDeviceId) {
      alert('연결할 기기를 선택하세요');
      return;
    }

    requestPairing(selectedDeviceId);
  };

  if (!isConnected) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <p className="text-gray-600">시그널링 서버에 연결 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">오디오 전송 (모바일)</h2>

      {!isPaired && !isStreaming && (
        <>
          <p className="text-gray-600 mb-4">
            노트북 기기를 선택하여 오디오를 전송하세요
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연결할 기기 선택
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 기기 선택 --</option>
              {availableDevices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.deviceName} ({device.deviceType})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleConnectDevice}
            disabled={!selectedDeviceId}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            연결 요청
          </button>
        </>
      )}

      {isPaired && !isStreaming && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">연결 중...</p>
          <p className="text-sm text-gray-500 mt-2">
            상태: {connectionState || '연결 대기'}
          </p>
        </div>
      )}

      {isStreaming && (
        <>
          <div className="mb-6 text-center">
            <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
              <svg
                className="w-12 h-12 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-600">
              오디오 전송 중
            </p>
            <p className="text-sm text-gray-500 mt-1">
              노트북에서 실시간 자막을 확인하세요
            </p>
          </div>

          <button
            onClick={stopStreaming}
            className="w-full bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 font-medium"
          >
            전송 중지
          </button>
        </>
      )}
    </div>
  );
}