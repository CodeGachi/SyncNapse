import { io, Socket } from 'socket.io-client';

export interface SignalingClientOptions {
  backendUrl: string;
  userId: string;
  deviceId: string;
  onPairRequest?: (data: { fromDeviceId: string; fromSocketId: string }) => void;
  onPairResponse?: (data: { accepted: boolean; targetDeviceId: string; targetSocketId: string }) => void;
  onWebRTCOffer?: (data: { fromSocketId: string; offer: RTCSessionDescriptionInit }) => void;
  onWebRTCAnswer?: (data: { fromSocketId: string; answer: RTCSessionDescriptionInit }) => void;
  onIceCandidate?: (data: { fromSocketId: string; candidate: RTCIceCandidateInit }) => void;
  onTranscriptionStarted?: (data: { sessionId: string }) => void;
  onTranscriptionEnded?: (data: { sessionId: string }) => void;
}

export class SignalingClient {
  private socket: Socket | null = null;
  private options: SignalingClientOptions;

  constructor(options: SignalingClientOptions) {
    this.options = options;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(`${this.options.backendUrl}/webrtc`, {
          query: {
            userId: this.options.userId,
            deviceId: this.options.deviceId,
          },
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        this.setupEventListeners();

        this.socket.on('connect', () => {
          console.log('[SignalingClient] Connected to signaling server');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[SignalingClient] Connection error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('pair-request', (data) => {
      console.log('[SignalingClient] Received pair request:', data);
      this.options.onPairRequest?.(data);
    });

    this.socket.on('pair-response', (data) => {
      console.log('[SignalingClient] Received pair response:', data);
      this.options.onPairResponse?.(data);
    });

    this.socket.on('pair-error', (data) => {
      console.error('[SignalingClient] Pair error:', data);
    });

    this.socket.on('webrtc-offer', (data) => {
      console.log('[SignalingClient] Received WebRTC offer');
      this.options.onWebRTCOffer?.(data);
    });

    this.socket.on('webrtc-answer', (data) => {
      console.log('[SignalingClient] Received WebRTC answer');
      this.options.onWebRTCAnswer?.(data);
    });

    this.socket.on('ice-candidate', (data) => {
      console.log('[SignalingClient] Received ICE candidate');
      this.options.onIceCandidate?.(data);
    });

    this.socket.on('transcription-started', (data) => {
      console.log('[SignalingClient] Transcription started:', data);
      this.options.onTranscriptionStarted?.(data);
    });

    this.socket.on('transcription-ended', (data) => {
      console.log('[SignalingClient] Transcription ended:', data);
      this.options.onTranscriptionEnded?.(data);
    });

    this.socket.on('disconnect', () => {
      console.log('[SignalingClient] Disconnected from signaling server');
    });

    this.socket.on('reconnect', () => {
      console.log('[SignalingClient] Reconnected to signaling server');
    });
  }

  sendPairRequest(targetDeviceId: string) {
    if (!this.socket) throw new Error('Not connected to signaling server');
    
    console.log(`[SignalingClient] Sending pair request to ${targetDeviceId}`);
    this.socket.emit('pair-request', { targetDeviceId });
  }

  sendPairResponse(accepted: boolean, targetSocketId: string) {
    if (!this.socket) throw new Error('Not connected to signaling server');
    
    console.log(`[SignalingClient] Sending pair response: ${accepted}`);
    this.socket.emit('pair-response', { accepted, targetSocketId });
  }

  sendOffer(targetSocketId: string, offer: RTCSessionDescriptionInit) {
    if (!this.socket) throw new Error('Not connected to signaling server');
    
    console.log('[SignalingClient] Sending WebRTC offer');
    this.socket.emit('webrtc-offer', { targetSocketId, offer });
  }

  sendAnswer(targetSocketId: string, answer: RTCSessionDescriptionInit) {
    if (!this.socket) throw new Error('Not connected to signaling server');
    
    console.log('[SignalingClient] Sending WebRTC answer');
    this.socket.emit('webrtc-answer', { targetSocketId, answer });
  }

  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit) {
    if (!this.socket) throw new Error('Not connected to signaling server');
    
    this.socket.emit('ice-candidate', { targetSocketId, candidate });
  }

  startTranscription(receiverDeviceId: string, noteId?: string) {
    if (!this.socket) throw new Error('Not connected to signaling server');
    
    console.log('[SignalingClient] Starting transcription session');
    this.socket.emit('start-transcription', { receiverDeviceId, noteId });
  }

  endTranscription(sessionId: string) {
    if (!this.socket) throw new Error('Not connected to signaling server');
    
    console.log('[SignalingClient] Ending transcription session');
    this.socket.emit('end-transcription', { sessionId });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
