import { Test, TestingModule } from '@nestjs/testing';
import { WebrtcGateway } from './webrtc.gateway';
import { WebrtcService } from './webrtc.service';
import { AuthService } from '../auth/services/auth.service';
import { Socket } from 'socket.io';

describe('WebrtcGateway', () => {
  let gateway: WebrtcGateway;
  let service: any;

  const mockWebrtcService = {
    registerOnlineDevice: jest.fn(),
    unregisterOnlineDevice: jest.fn(),
    getDeviceSocketId: jest.fn(),
    createTranscriptionSession: jest.fn(),
    endTranscriptionSession: jest.fn(),
  };

  const mockAuthService = {
    validateToken: jest.fn(),
  };

  const mockSocket = {
    id: 'socket-1',
    handshake: {
      query: {
        userId: 'user-1',
        deviceId: 'device-1',
        token: 'valid-token',
      },
    },
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebrtcGateway,
        { provide: WebrtcService, useValue: mockWebrtcService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    gateway = module.get<WebrtcGateway>(WebrtcGateway);
    service = module.get<WebrtcService>(WebrtcService);
    
    // Mock server
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should register device and join user room', async () => {
      mockAuthService.validateToken.mockResolvedValue({ userId: 'user-1' });
      
      await gateway.handleConnection(mockSocket);
      
      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockWebrtcService.registerOnlineDevice).toHaveBeenCalledWith(
        'user-1',
        'device-1',
        'socket-1'
      );
      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
    });
  });

  describe('Collaboration Events', () => {
    it('should handle join-note', () => {
      gateway.handleJoinNote(mockSocket, { noteId: 'note-1' });
      expect(mockSocket.join).toHaveBeenCalledWith('note:note-1');
      expect(mockSocket.to).toHaveBeenCalledWith('note:note-1');
      // Check emit on the broadcast operator
      // Since mockSocket.to() returns this (mockSocket), we check mockSocket.emit
      expect(mockSocket.emit).toHaveBeenCalledWith('user-joined-note', { userId: 'user-1' });
    });

    it('should handle leave-note', () => {
      gateway.handleLeaveNote(mockSocket, { noteId: 'note-1' });
      expect(mockSocket.leave).toHaveBeenCalledWith('note:note-1');
      expect(mockSocket.to).toHaveBeenCalledWith('note:note-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('user-left-note', { userId: 'user-1' });
    });

    it('should handle note-update', () => {
      const updateData = { noteId: 'note-1', content: { delta: 'abc' }, version: 2 };
      gateway.handleNoteUpdate(mockSocket, updateData);
      expect(mockSocket.to).toHaveBeenCalledWith('note:note-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('note-updated', expect.objectContaining({
        userId: 'user-1',
        noteId: 'note-1',
        content: updateData.content,
        version: 2,
      }));
    });
  });
});

