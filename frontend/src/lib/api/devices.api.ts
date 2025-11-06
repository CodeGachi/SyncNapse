import { apiClient } from './client';

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  fingerprint: string;
  publicKey?: string;
  lastSeenAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterDeviceDto {
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  fingerprint: string;
  publicKey?: string;
}

export interface UpdateDeviceDto {
  deviceName?: string;
  isActive?: boolean;
}

/**
 * Register a new device
 */
export async function registerDevice(
  dto: RegisterDeviceDto,
): Promise<TrustedDevice> {
  return apiClient<TrustedDevice>('/devices/register', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Get all user's devices
 */
export async function getDevices(): Promise<TrustedDevice[]> {
  return apiClient<TrustedDevice[]>('/devices');
}

/**
 * Get available devices for pairing
 */
export async function getAvailableDevices(
  currentDeviceId: string,
): Promise<TrustedDevice[]> {
  return apiClient<TrustedDevice[]>(`/devices/available/${currentDeviceId}`);
}

/**
 * Get a specific device
 */
export async function getDevice(deviceId: string): Promise<TrustedDevice> {
  return apiClient<TrustedDevice>(`/devices/${deviceId}`);
}

/**
 * Update device information
 */
export async function updateDevice(
  deviceId: string,
  dto: UpdateDeviceDto,
): Promise<TrustedDevice> {
  return apiClient<TrustedDevice>(`/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

/**
 * Delete a device
 */
export async function deleteDevice(
  deviceId: string,
): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/devices/${deviceId}`, {
    method: 'DELETE',
  });
}