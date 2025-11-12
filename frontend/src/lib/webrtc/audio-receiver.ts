import { SignalingClient } from './signaling-client';
import { PeerConnectionManager } from './peer-connection';

export interface AudioReceiverOptions {
  signalingClient: SignalingClient;
  onAudioStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export class AudioReceiver {
  private signalingClient: SignalingClient;
  private peerConnection: PeerConnectionManager | null = null;
  private senderSocketId: string | null = null;
  private remoteStream: MediaStream | null = null;
  private options: AudioReceiverOptions;

  constructor(options: AudioReceiverOptions) {
    this.signalingClient = options.signalingClient;
    this.options = options;
  }

  handlePairingRequest(fromDeviceId: string, fromSocketId: string): {
    accept: () => Promise<void>;
    reject: () => void;
  } {
    console.log(`[AudioReceiver] Received pairing request from ${fromDeviceId}`);

    return {
      accept: async () => {
        console.log('[AudioReceiver] Accepting pairing request...');
        this.senderSocketId = fromSocketId;

        this.peerConnection = new PeerConnectionManager({
          onTrack: (stream) => {
            console.log('[AudioReceiver] Received remote audio stream');
            this.remoteStream = stream;
            this.options.onAudioStream?.(stream);
          },
          onIceCandidate: (candidate) => {
            if (this.senderSocketId) {
              this.signalingClient.sendIceCandidate(this.senderSocketId, candidate);
            }
          },
          onConnectionStateChange: this.options.onConnectionStateChange,
        });

        this.peerConnection.initialize();

        this.signalingClient.sendPairResponse(true, fromSocketId);
      },
      reject: () => {
        console.log('[AudioReceiver] Rejecting pairing request');
        this.signalingClient.sendPairResponse(false, fromSocketId);
      },
    };
  }

  async handleOffer(offer: RTCSessionDescriptionInit, fromSocketId: string) {
    if (!this.peerConnection) {
      console.error('[AudioReceiver] No peer connection initialized');
      return;
    }

    console.log('[AudioReceiver] Received offer, creating answer...');

    await this.peerConnection.setRemoteDescription(offer);

    const answer = await this.peerConnection.createAnswer();
    this.signalingClient.sendAnswer(fromSocketId, answer);
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      console.error('[AudioReceiver] No peer connection initialized');
      return;
    }

    await this.peerConnection.addIceCandidate(candidate);
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  stop() {
    console.log('[AudioReceiver] Stopping...');

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.senderSocketId = null;
    this.remoteStream = null;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.getConnectionState() || null;
  }

  isActive(): boolean {
    return this.remoteStream !== null;
  }
}
