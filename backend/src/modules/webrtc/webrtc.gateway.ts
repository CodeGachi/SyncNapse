import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { WebrtcService } from './webrtc.service';
import { AuthService } from '../auth/services/auth.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'webrtc',
})
export class WebrtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebrtcGateway.name);

  constructor(
    private readonly webrtcService: WebrtcService,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const { userId, deviceId, token } = client.handshake.query;
      
      // 1. Verify Token
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = await this.authService.validateToken(token as string);
      
      // 2. Validate userId matches token
      if (userId && payload.userId !== userId) {
        this.logger.warn(`Client ${client.id} userId mismatch: token=${payload.userId}, query=${userId}`);
        client.disconnect();
        return;
      }

      const validatedUserId = payload.userId;

      if (!deviceId) {
        this.logger.warn(`Client ${client.id} connected without deviceId`);
        client.disconnect();
        return;
      }

      this.logger.log(`Client connected: ${client.id} (User: ${validatedUserId}, Device: ${deviceId})`);
      
      this.webrtcService.registerOnlineDevice(
        validatedUserId,
        deviceId as string,
        client.id,
      );

      client.join(`user:${validatedUserId}`);
    } catch (error) {
      this.logger.error(`Connection rejected: ${error instanceof Error ? error.message : 'Unknown error'}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const { userId, deviceId } = client.handshake.query;
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (userId && deviceId) {
      this.webrtcService.unregisterOnlineDevice(
        userId as string,
        deviceId as string,
      );
    }
  }

  @SubscribeMessage('pair-request')
  async handlePairRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetDeviceId: string },
  ) {
    const { userId, deviceId } = client.handshake.query;
    
    this.logger.log(
      `Pair request from ${deviceId} to ${data.targetDeviceId}`,
    );

    const targetSocketId = this.webrtcService.getDeviceSocketId(
      userId as string,
      data.targetDeviceId,
    );

    if (!targetSocketId) {
      client.emit('pair-error', { message: 'Target device not online' });
      return;
    }

    this.server.to(targetSocketId).emit('pair-request', {
      fromDeviceId: deviceId,
      fromSocketId: client.id,
    });
  }

  @SubscribeMessage('pair-response')
  async handlePairResponse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { accepted: boolean; targetSocketId: string },
  ) {
    const { deviceId } = client.handshake.query;

    this.logger.log(
      `Pair response from ${deviceId}: ${data.accepted ? 'accepted' : 'rejected'}`,
    );

    this.server.to(data.targetSocketId).emit('pair-response', {
      accepted: data.accepted,
      targetDeviceId: deviceId,
      targetSocketId: client.id,
    });
  }

  @SubscribeMessage('webrtc-offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetSocketId: string; offer: RTCSessionDescriptionInit },
  ) {
    this.logger.log(`Forwarding WebRTC offer to ${data.targetSocketId}`);
    
    this.server.to(data.targetSocketId).emit('webrtc-offer', {
      fromSocketId: client.id,
      offer: data.offer,
    });
  }

  @SubscribeMessage('webrtc-answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetSocketId: string; answer: RTCSessionDescriptionInit },
  ) {
    this.logger.log(`Forwarding WebRTC answer to ${data.targetSocketId}`);
    
    this.server.to(data.targetSocketId).emit('webrtc-answer', {
      fromSocketId: client.id,
      answer: data.answer,
    });
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetSocketId: string; candidate: RTCIceCandidateInit },
  ) {
    this.logger.debug(`Forwarding ICE candidate to ${data.targetSocketId}`);
    
    this.server.to(data.targetSocketId).emit('ice-candidate', {
      fromSocketId: client.id,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('start-transcription')
  async handleStartTranscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverDeviceId: string; noteId?: string },
  ) {
    const { userId, deviceId } = client.handshake.query;

    this.logger.log(
      `Starting transcription session: ${deviceId} -> ${data.receiverDeviceId}`,
    );

    const session = await this.webrtcService.createTranscriptionSession(
      userId as string,
      deviceId as string,
      data.receiverDeviceId,
      data.noteId,
    );

    client.emit('transcription-started', { sessionId: session.id });
  }

  @SubscribeMessage('end-transcription')
  async handleEndTranscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.logger.log(`Ending transcription session: ${data.sessionId}`);

    await this.webrtcService.endTranscriptionSession(data.sessionId);

    client.emit('transcription-ended', { sessionId: data.sessionId });
  }

  // Real-time Collaboration (Note Sync)

  @SubscribeMessage('join-note')
  handleJoinNote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { noteId: string },
  ) {
    const { userId } = client.handshake.query;
    const { noteId } = data;

    if (!noteId) return;

    this.logger.log(`User ${userId} joining note room: ${noteId}`);
    client.join(`note:${noteId}`);
    
    // Notify others in the room
    client.to(`note:${noteId}`).emit('user-joined-note', { userId });
  }

  @SubscribeMessage('leave-note')
  handleLeaveNote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { noteId: string },
  ) {
    const { userId } = client.handshake.query;
    const { noteId } = data;

    if (!noteId) return;

    this.logger.log(`User ${userId} leaving note room: ${noteId}`);
    client.leave(`note:${noteId}`);

    // Notify others
    client.to(`note:${noteId}`).emit('user-left-note', { userId });
  }

  @SubscribeMessage('note-update')
  handleNoteUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { noteId: string; content: any; version?: number },
  ) {
    const { userId } = client.handshake.query;
    const { noteId, content, version } = data;

    // Broadcast to everyone else in the room
    client.to(`note:${noteId}`).emit('note-updated', {
      userId,
      noteId,
      content,
      version,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { noteId: string; x: number; y: number; pageNumber: number },
  ) {
    const { userId } = client.handshake.query;
    const { noteId } = data;

    // Broadcast cursor position (volatile/unreliable is fine for performance)
    client.to(`note:${noteId}`).emit('cursor-moved', {
      userId,
      ...data,
    });
  }
}
