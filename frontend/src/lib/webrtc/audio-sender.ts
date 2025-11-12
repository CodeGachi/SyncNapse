import { SignalingClient } from './signaling-client';
import { PeerConnectionManager } from './peer-connection';

export interface AudioSenderOptions {
  signalingClient: SignalingClient;
  targetDeviceId: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export class AudioSender {
  private signalingClient: SignalingClient;
  private peerConnection: PeerConnectionManager;
  private localStream: MediaStream | null = null;
  private targetSocketId: string | null = null;
  private targetDeviceId: string;

  constructor(options: AudioSenderOptions) {
    this.signalingClient = options.signalingClient;
    this.targetDeviceId = options.targetDeviceId;

    this.peerConnection = new PeerConnectionManager({
      onIceCandidate: (candidate) => {
        if (this.targetSocketId) {
          this.signalingClient.sendIceCandidate(this.targetSocketId, candidate);
        }
      },
      onConnectionStateChange: options.onConnectionStateChange,
    });
  }

  async start() {
    console.log('[AudioSender] Starting...');

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000, // Optimal sample rate for speech recognition
      },
      video: false,
    });

    console.log('[AudioSender] Microphone access granted');

    this.peerConnection.initialize();
    await this.peerConnection.addAudioStream(this.localStream);

    this.signalingClient.sendPairRequest(this.targetDeviceId);

    console.log('[AudioSender] Waiting for pairing acceptance...');
  }

  async handlePairingAccepted(targetSocketId: string) {
    console.log('[AudioSender] Pairing accepted, creating offer...');
    this.targetSocketId = targetSocketId;

    const offer = await this.peerConnection.createOffer();
    this.signalingClient.sendOffer(targetSocketId, offer);
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    console.log('[AudioSender] Received answer, setting remote description...');
    await this.peerConnection.setRemoteDescription(answer);
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    await this.peerConnection.addIceCandidate(candidate);
  }

  stop() {
    console.log('[AudioSender] Stopping...');

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.peerConnection.close();

    this.targetSocketId = null;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection.getConnectionState();
  }

  isActive(): boolean {
    return this.localStream !== null && this.targetSocketId !== null;
  }
}
