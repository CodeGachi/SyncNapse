export interface PeerConnectionOptions {
  onTrack?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  iceServers?: RTCIceServer[];
}

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private options: PeerConnectionOptions;
  private remoteStream: MediaStream | null = null;

  constructor(options: PeerConnectionOptions = {}) {
    this.options = options;
  }

  initialize() {
    const config: RTCConfiguration = {
      iceServers: this.options.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[PeerConnection] New ICE candidate');
        this.options.onIceCandidate?.(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('[PeerConnection] Received remote track');
      this.remoteStream = event.streams[0];
      this.options.onTrack?.(event.streams[0]);
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[PeerConnection] Connection state:', state);
      if (state) {
        this.options.onConnectionStateChange?.(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(
        '[PeerConnection] ICE connection state:',
        this.peerConnection?.iceConnectionState,
      );
    };

    console.log('[PeerConnection] Initialized');
  }

  async addAudioStream(stream: MediaStream) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    stream.getTracks().forEach((track) => {
      console.log('[PeerConnection] Adding local track:', track.kind);
      this.peerConnection!.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[PeerConnection] Creating offer...');
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await this.peerConnection.setLocalDescription(offer);
    console.log('[PeerConnection] Offer created and set as local description');

    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[PeerConnection] Creating answer...');
    const answer = await this.peerConnection.createAnswer();

    await this.peerConnection.setLocalDescription(answer);
    console.log('[PeerConnection] Answer created and set as local description');

    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    console.log('[PeerConnection] Setting remote description:', description.type);
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description),
    );
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[PeerConnection] ICE candidate added');
    } catch (error) {
      console.error('[PeerConnection] Error adding ICE candidate:', error);
    }
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState || null;
  }

  close() {
    if (this.peerConnection) {
      console.log('[PeerConnection] Closing connection');
      this.peerConnection.close();
      this.peerConnection = null;
      this.remoteStream = null;
    }
  }
}
