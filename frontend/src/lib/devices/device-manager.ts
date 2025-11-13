import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'syncnapse_device_id';
const DEVICE_FINGERPRINT_KEY = 'syncnapse_device_fingerprint';

export class DeviceManager {
  static getOrCreateFingerprint(): string {
    const existingFingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (existingFingerprint) {
      return existingFingerprint;
    }

    const fingerprint = this.generateFingerprint();
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    
    return fingerprint;
  }

  private static generateFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.hardwareConcurrency?.toString() || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth?.toString() || '',
      new Date().getTimezoneOffset().toString(),
      uuidv4(),
    ];

    const fingerprint = components.join('|');
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `fp_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  }

  static getDeviceId(): string | null {
    return localStorage.getItem(DEVICE_ID_KEY);
  }

  static setDeviceId(deviceId: string): void {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  static clearDeviceData(): void {
    localStorage.removeItem(DEVICE_ID_KEY);
  }

  static getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    const ua = navigator.userAgent.toLowerCase();
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    
    if (
      /mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile|android.*mobile/i.test(
        ua,
      )
    ) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  static getSuggestedDeviceName(): string {
    const deviceType = this.getDeviceType();
    const platform = this.getPlatform();
    
    return `${platform} ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
  }

  private static getPlatform(): string {
    const ua = navigator.userAgent;
    
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Win/i.test(ua)) return 'Windows';
    if (/Linux/i.test(ua)) return 'Linux';
    if (/iPhone|iPad/i.test(ua)) return 'iOS';
    if (/Android/i.test(ua)) return 'Android';
    
    return 'Unknown';
  }
}
