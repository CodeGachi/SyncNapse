/**
 * Device Registration Hook
 */

'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { registerDevice, getDevices, updateDevice, deleteDevice } from '@/lib/api/devices.api';
import { DeviceManager } from '@/lib/devices/device-manager';

export function useDeviceRegistration() {
  const queryClient = useQueryClient();
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Load current device ID from localStorage
  useEffect(() => {
    const deviceId = DeviceManager.getDeviceId();
    setCurrentDeviceId(deviceId);
  }, []);

  // Get all devices
  const {
    data: devices = [],
    isLoading: isLoadingDevices,
    error: devicesError,
  } = useQuery({
    queryKey: ['devices'],
    queryFn: getDevices,
  });

  // Register device mutation
  const registerMutation = useMutation({
    mutationFn: registerDevice,
    onSuccess: (device) => {
      // Store device ID
      DeviceManager.setDeviceId(device.id);
      setCurrentDeviceId(device.id);
      
      // Invalidate devices query
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Update device mutation
  const updateMutation = useMutation({
    mutationFn: ({ deviceId, data }: { deviceId: string; data: any }) =>
      updateDevice(deviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Delete device mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Auto-register current device if not registered
  const autoRegisterCurrentDevice = async () => {
    const fingerprint = DeviceManager.getOrCreateFingerprint();
    const deviceType = DeviceManager.getDeviceType();
    const suggestedName = DeviceManager.getSuggestedDeviceName();

    try {
      await registerMutation.mutateAsync({
        deviceName: suggestedName,
        deviceType,
        fingerprint,
      });
      return true;
    } catch (error) {
      console.error('Auto-registration failed:', error);
      return false;
    }
  };

  // Check if current device is registered
  const isCurrentDeviceRegistered = currentDeviceId !== null;

  // Get current device info
  const currentDevice = devices.find((d) => d.id === currentDeviceId);

  return {
    // State
    devices,
    currentDeviceId,
    currentDevice,
    isCurrentDeviceRegistered,
    
    // Loading states
    isLoadingDevices,
    isRegistering: registerMutation.isPending,
    
    // Errors
    devicesError,
    registerError: registerMutation.error,
    
    // Actions
    registerDevice: registerMutation.mutate,
    updateDevice: updateMutation.mutate,
    deleteDevice: deleteMutation.mutate,
    autoRegisterCurrentDevice,
  };
}

