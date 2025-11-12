/**
 * Device Pairing Hook
 * Manages P2P device pairing for audio streaming
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignalingClient } from '@/lib/webrtc';
import { useQuery } from '@tanstack/react-query';
import { getAvailableDevices } from '@/lib/api/devices.api';

export interface PairingRequest {
  fromDeviceId: string;
  fromSocketId: string;
}

export function useDevicePairing(userId: string, deviceId: string) {
  const [signalingClient, setSignalingClient] = useState<SignalingClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pairingRequest, setPairingRequest] = useState<PairingRequest | null>(null);
  const [pairedDeviceId, setPairedDeviceId] = useState<string | null>(null);
  const [pairedSocketId, setPairedSocketId] = useState<string | null>(null);

  // Get available devices for pairing
  const {
    data: availableDevices = [],
    isLoading: isLoadingDevices,
    refetch: refetchAvailableDevices,
  } = useQuery({
    queryKey: ['available-devices', deviceId],
    queryFn: () => getAvailableDevices(deviceId),
    enabled: !!deviceId && isConnected,
  });

  // Initialize signaling client
  useEffect(() => {
    if (!userId || !deviceId) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    const client = new SignalingClient({
      backendUrl,
      userId,
      deviceId,
      
      onPairRequest: (data) => {
        console.log('[DevicePairing] Received pairing request:', data);
        setPairingRequest(data);
      },
      
      onPairResponse: (data) => {
        console.log('[DevicePairing] Received pairing response:', data);
        if (data.accepted) {
          setPairedDeviceId(data.targetDeviceId);
          setPairedSocketId(data.targetSocketId);
        }
      },
    });

    // Connect to signaling server
    client
      .connect()
      .then(() => {
        console.log('[DevicePairing] Connected to signaling server');
        setSignalingClient(client);
        setIsConnected(true);
      })
      .catch((error) => {
        console.error('[DevicePairing] Connection failed:', error);
      });

    // Cleanup on unmount
    return () => {
      client.disconnect();
      setSignalingClient(null);
      setIsConnected(false);
    };
  }, [userId, deviceId]);

  // Send pairing request
  const requestPairing = useCallback(
    (targetDeviceId: string) => {
      if (!signalingClient) {
        console.error('[DevicePairing] Signaling client not connected');
        return;
      }

      console.log('[DevicePairing] Requesting pairing with:', targetDeviceId);
      signalingClient.sendPairRequest(targetDeviceId);
    },
    [signalingClient],
  );

  // Accept pairing request
  const acceptPairing = useCallback(() => {
    if (!signalingClient || !pairingRequest) {
      console.error('[DevicePairing] Cannot accept pairing');
      return;
    }

    console.log('[DevicePairing] Accepting pairing request');
    signalingClient.sendPairResponse(true, pairingRequest.fromSocketId);
    
    setPairedDeviceId(pairingRequest.fromDeviceId);
    setPairedSocketId(pairingRequest.fromSocketId);
    setPairingRequest(null);
  }, [signalingClient, pairingRequest]);

  // Reject pairing request
  const rejectPairing = useCallback(() => {
    if (!signalingClient || !pairingRequest) {
      console.error('[DevicePairing] Cannot reject pairing');
      return;
    }

    console.log('[DevicePairing] Rejecting pairing request');
    signalingClient.sendPairResponse(false, pairingRequest.fromSocketId);
    setPairingRequest(null);
  }, [signalingClient, pairingRequest]);

  // Clear pairing
  const clearPairing = useCallback(() => {
    setPairedDeviceId(null);
    setPairedSocketId(null);
  }, []);

  return {
    // State
    signalingClient,
    isConnected,
    availableDevices,
    pairingRequest,
    pairedDeviceId,
    pairedSocketId,
    isPaired: pairedDeviceId !== null,
    
    // Loading
    isLoadingDevices,
    
    // Actions
    requestPairing,
    acceptPairing,
    rejectPairing,
    clearPairing,
    refetchAvailableDevices,
  };
}

