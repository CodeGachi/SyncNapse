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
import { Logger } from '@nestjs/common';
import { WebrtcService } from './webrtc.service';

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

  constructor(private readonly webrtcService: WebrtcService) {}

  handleConnection(client: Socket) {
    const { userId, deviceId } = client.handshake.query;
    
    if (!userId || !deviceId) {
      this.logger.warn(`Client ${client.id} connected without userId or deviceId`);
      client.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${client.id} (User: ${userId}, Device: ${deviceId})`);
    
    this.webrtcService.registerOnlineDevice(
      userId as string,
      deviceId as string,
      client.id,
    );

    client.join(`user:${userId}`);
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
}
