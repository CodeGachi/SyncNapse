import { Test, TestingModule } from '@nestjs/testing';
import { OAuthStateService } from './oauth-state.service';
import { PrismaService } from '../../db/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('OAuthStateService', () => {
  let service: OAuthStateService;

  const mockPrismaService = {
    oAuthState: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthStateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OAuthStateService>(OAuthStateService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createState', () => {
    it('should create OAuth state successfully', async () => {
      mockPrismaService.oAuthState.create.mockResolvedValue({
        id: 'state-id',
        state: 'random-state',
        provider: 'google',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const state = await service.createState('google');

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(mockPrismaService.oAuthState.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateState', () => {
    it('should throw if state is missing', async () => {
      await expect(
        service.validateState('', 'google'),
      ).rejects.toThrow('Missing state parameter');
    });

    it('should throw if state not found', async () => {
      mockPrismaService.oAuthState.findUnique.mockResolvedValue(null);

      await expect(
        service.validateState('invalid-state', 'google'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if provider mismatch', async () => {
      mockPrismaService.oAuthState.findUnique.mockResolvedValue({
        id: 'state-id',
        state: 'valid-state',
        provider: 'github',
        expiresAt: new Date(Date.now() + 600000),
        usedAt: null,
      });

      await expect(
        service.validateState('valid-state', 'google'),
      ).rejects.toThrow('OAuth state provider mismatch');
    });

    it('should validate state successfully', async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);

      mockPrismaService.oAuthState.findUnique.mockResolvedValue({
        id: 'state-id',
        state: 'valid-state',
        provider: 'google',
        expiresAt: futureDate,
        usedAt: null,
        redirectUrl: null,
      });

      mockPrismaService.oAuthState.update.mockResolvedValue({});

      const result = await service.validateState('valid-state', 'google');

      expect(result).toBeDefined();
      expect(mockPrismaService.oAuthState.update).toHaveBeenCalledTimes(1);
    });
  });
});